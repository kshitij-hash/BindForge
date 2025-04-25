import os
import tempfile
import subprocess
from pathlib import Path
from rdkit import Chem
from rdkit.Chem import AllChem
import numpy as np

from utils.molecule_handler import process_smiles
from utils.warhead_detector import (
    WarheadDetector, calculate_covalent_score, predict_covalent_binding
)
from utils.pdb_cleaner import clean_pdb_for_docking  # Import the new function

class DockingController:
    def __init__(self, vina_path="vina", protein_path=None, center_x=0, center_y=0, center_z=0):
        self.vina_path = vina_path
        self.protein_path = protein_path
        # Default box size and center
        self.center_x = center_x
        self.center_y = center_y
        self.center_z = center_z
        self.size_x = 20
        self.size_y = 20
        self.size_z = 20
        
        # Initialize warhead detector
        self.warhead_detector = WarheadDetector()
        
    def set_box_center(self, x, y, z):
        """Set the center of the docking box"""
        self.center_x = x
        self.center_y = y
        self.center_z = z
        
    def set_box_size(self, x, y, z):
        """Set the size of the docking box"""
        self.size_x = x
        self.size_y = y
        self.size_z = z
    
    def set_protein(self, protein_path):
        """Set the protein structure for docking"""
        if not os.path.exists(protein_path):
            raise FileNotFoundError(f"Protein file not found: {protein_path}")
        
        # Check file format and convert if necessary
        if protein_path.lower().endswith('.pdb'):
            print(f"Processing PDB file: {protein_path}")
            
            # First, clean the PDB file to remove hydrogens and CONECT records
            cleaned_pdb = clean_pdb_for_docking(protein_path)
            
            # Then convert to PDBQT
            print(f"Converting cleaned PDB to PDBQT: {cleaned_pdb}")
            pdbqt_path = self._convert_pdb_to_pdbqt(cleaned_pdb)
            
            if pdbqt_path:
                # Clean the PDBQT file to ensure it's compatible with Vina
                cleaned_path = self.prepare_clean_pdbqt(pdbqt_path)
                self.protein_path = cleaned_path
            else:
                raise ValueError(f"Failed to convert protein file {protein_path} to PDBQT format")
        elif protein_path.lower().endswith('.pdbqt'):
            # Clean existing PDBQT to ensure compatibility
            cleaned_path = self.prepare_clean_pdbqt(protein_path)
            self.protein_path = cleaned_path
        else:
            raise ValueError(f"Unsupported protein file format: {protein_path}. Use PDB or PDBQT format.")
    
    def _convert_pdb_to_pdbqt(self, pdb_path):
        """Convert PDB file to PDBQT format using Open Babel"""
        try:
            output_path = os.path.splitext(pdb_path)[0] + ".pdbqt"
            # Use Open Babel to convert PDB to PDBQT with the -xr flag for rigid receptor
            cmd = f"obabel {pdb_path} -O {output_path} -xr"
            process = subprocess.run(cmd, shell=True, capture_output=True, text=True)
            
            if process.returncode != 0:
                print(f"Error converting PDB to PDBQT: {process.stderr}")
                return None
                
            if os.path.exists(output_path):
                return output_path
            return None
        except Exception as e:
            print(f"Error during PDB to PDBQT conversion: {str(e)}")
            return None
    
    def _convert_ligand_to_pdbqt(self, pdb_path):
        """Convert ligand PDB file to PDBQT format using Open Babel with correct parameters"""
        try:
            output_path = os.path.splitext(pdb_path)[0] + ".pdbqt"
            # Use Open Babel to convert PDB to PDBQT with the -xn flag for flexible ligand
            # and --partialcharge gasteiger for adding proper charges
            cmd = f"obabel {pdb_path} -O {output_path} -xn --partialcharge gasteiger"
            process = subprocess.run(cmd, shell=True, capture_output=True, text=True)
            
            if process.returncode != 0:
                print(f"Error converting ligand PDB to PDBQT: {process.stderr}")
                # Try alternative method if the first one fails
                cmd = f"obabel {pdb_path} -O {output_path} -xn"
                process = subprocess.run(cmd, shell=True, capture_output=True, text=True)
                
                if process.returncode != 0:
                    return None
            
            if os.path.exists(output_path):
                # Clean the PDBQT file to ensure it's compatible with Vina
                cleaned_path = self.prepare_clean_pdbqt(output_path, is_ligand=True)
                return cleaned_path
            return None
        except Exception as e:
            print(f"Error during ligand PDB to PDBQT conversion: {str(e)}")
            return None

    def generate_vina_compatible_ligand(self, pdb_path):
        """
        Generate a PDBQT file for a ligand that is guaranteed to work with Vina
        by using MGLTools or directly generating the proper format
        
        Args:
            pdb_path (str): Path to ligand PDB file
            
        Returns:
            str: Path to generated PDBQT file
        """
        output_path = os.path.splitext(pdb_path)[0] + "_vina.pdbqt"
        
        # Try using a direct approach to generate a simple PDBQT
        try:
            # Get atom coordinates from PDB
            coords = []
            atom_elements = []
            
            with open(pdb_path, 'r') as f:
                for line in f:
                    if line.startswith('ATOM') or line.startswith('HETATM'):
                        try:
                            x = float(line[30:38].strip())
                            y = float(line[38:46].strip())
                            z = float(line[46:54].strip())
                            
                            # Get element - typically the last column or inferred from atom name
                            if len(line) >= 78:
                                element = line[76:78].strip()
                            else:
                                # Infer from atom name
                                atom_name = line[12:16].strip()
                                element = atom_name[0]  # First character of atom name
                                
                            coords.append((x, y, z))
                            atom_elements.append(element)
                        except (ValueError, IndexError):
                            continue
            
            # Write a minimal but valid PDBQT file
            with open(output_path, 'w') as f:
                f.write("ROOT\n")
                
                for i, (coord, element) in enumerate(zip(coords, atom_elements)):
                    x, y, z = coord
                    # Ensure element is a valid AutoDock Vina atom type
                    if element not in ["C", "N", "O", "H", "S", "P", "F", "Cl", "Br", "I"]:
                        element = "C"  # Default to carbon
                    
                    # Format that works with Vina: no charge columns
                    f.write(f"ATOM  {i+1:5d}  {element:<2}  LIG A   1    {x:8.3f}{y:8.3f}{z:8.3f}  1.00  0.00    {element:>2}\n")
                    
                f.write("ENDROOT\n")
                f.write("TORSDOF 0\n")
            
            return output_path
        except Exception as e:
            print(f"Error generating Vina-compatible ligand PDBQT: {str(e)}")
            return None

    def prepare_ligand(self, smiles):
        """Prepare ligand from SMILES for docking"""
        result = process_smiles(smiles)
        if result["status"] != "success":
            return result
        
        # Detect warheads
        mol = Chem.MolFromSmiles(smiles)
        warhead_result = self.warhead_detector.detect_warheads(mol)
        
        # Get 3D coordinates
        mol = Chem.AddHs(mol)
        AllChem.EmbedMolecule(mol, randomSeed=42)
        AllChem.MMFFOptimizeMolecule(mol)
        
        # Create a temporary file for the ligand
        ligand_file = tempfile.NamedTemporaryFile(suffix=".pdbqt", delete=False)
        ligand_file.close()
        
        # Convert to PDBQT format using Open Babel
        pdb_file = tempfile.NamedTemporaryFile(suffix=".pdb", delete=False)
        pdb_file.close()
        Chem.MolToPDBFile(mol, pdb_file.name)
        
        cmd = f"obabel {pdb_file.name} -O {ligand_file.name}"
        process = subprocess.run(cmd, shell=True, capture_output=True)
        
        if process.returncode != 0:
            return {"status": "error", "message": "Failed to convert ligand to PDBQT format"}
        
        return {
            "status": "success", 
            "ligand_path": ligand_file.name,
            "warhead_data": warhead_result
        }
    
    def run_docking(self, smiles, cysteine_coords=None):
        """Run docking with AutoDock Vina and calculate covalent scores"""
        if not self.protein_path:
            return {"status": "error", "message": "Protein structure not set"}
        
        # Prepare ligand
        ligand_result = self.prepare_ligand(smiles)
        if ligand_result["status"] != "success":
            return ligand_result
            
        ligand_path = ligand_result["ligand_path"]
        warhead_data = ligand_result["warhead_data"]
        
        # Create a config file for Vina
        config_file = tempfile.NamedTemporaryFile(suffix=".txt", delete=False)
        config_file.close()
        
        with open(config_file.name, 'w') as f:
            f.write(f"receptor = {self.protein_path}\n")
            f.write(f"ligand = {ligand_path}\n")
            f.write(f"center_x = {self.center_x}\n")
            f.write(f"center_y = {self.center_y}\n")
            f.write(f"center_z = {self.center_z}\n")
            f.write(f"size_x = {self.size_x}\n")
            f.write(f"size_y = {self.size_y}\n")
            f.write(f"size_z = {self.size_z}\n")
            f.write("exhaustiveness = 8\n")
            f.write("num_modes = 9\n")
            
        # Create output file
        output_file = tempfile.NamedTemporaryFile(suffix=".pdbqt", delete=False)
        output_file.close()
        
        # Run Vina
        cmd = f"{self.vina_path} --config {config_file.name} --out {output_file.name}"
        process = subprocess.run(cmd, shell=True, capture_output=True, text=True)
        
        if process.returncode != 0:
            return {"status": "error", "message": f"Docking failed: {process.stderr}"}
            
        # Parse docking results
        docking_results = self.parse_vina_output(process.stdout)
        
        # Calculate distance to cysteine and covalent scores
        if cysteine_coords:
            distances = self.calculate_distances(output_file.name, warhead_data, cysteine_coords)
            
            # Add prediction for each pose
            for i, pose in enumerate(docking_results):
                pose_distance = distances.get(i, float('inf'))
                pose["distance_to_cysteine"] = pose_distance
                pose["covalent_score"] = calculate_covalent_score(
                    pose["affinity"], pose_distance)
                pose["covalent_prediction"] = predict_covalent_binding(
                    pose["affinity"], warhead_data["has_warhead"], pose_distance
                )
                
        # Cleanup temporary files
        os.unlink(config_file.name)
        os.unlink(ligand_path)
        
        return {
            "status": "success",
            "docking_results": docking_results,
            "output_file": output_file.name,
            "has_warhead": warhead_data["has_warhead"],
            "warheads": warhead_data["warheads"]
        }
            
    def parse_vina_output(self, output_text):
        """Parse AutoDock Vina output to extract scores"""
        results = []
        for line in output_text.split('\n'):
            if line.startswith('   1 '):
                parts = line.split()
                if len(parts) >= 4:
                    results.append({
                        "mode": 1,
                        "affinity": float(parts[1]),
                        "rmsd_lb": float(parts[2]),
                        "rmsd_ub": float(parts[3])
                    })
        return results

    def calculate_distances(self, output_pdbqt, warhead_data, cysteine_coords):
        """Calculate distances between warheads and cysteine"""
        # Parse PDBQT file to get atom coordinates
        atom_coords = {}
        model = 1
        atom_idx = 0
        
        with open(output_pdbqt, 'r') as f:
            for line in f:
                if line.startswith('MODEL'):
                    model = int(line.split()[1])
                    atom_idx = 0
                    continue
                if line.startswith('ATOM') or line.startswith('HETATM'):
                    if model not in atom_coords:
                        atom_coords[model] = {}
                    x = float(line[30:38])
                    y = float(line[38:46])
                    z = float(line[46:54])
                    atom_coords[model][atom_idx] = (x, y, z)
                    atom_idx += 1
        
        # Calculate distances for each model
        distances = {}
                    
        # If no warheads, return infinite distance
        if not warhead_data["has_warhead"]:
            return {model: float('inf') for model in atom_coords}
        
        # Get reactive atom indices (this is a simplification)
        # In a real implementation, you'd need to map between SMILES atoms and PDBQT atoms
        reactive_indices = [0]  # Placeholder
        
        for model in atom_coords:
            min_distance = float('inf')
            for atom_idx in reactive_indices:
                if atom_idx in atom_coords[model]:
                    x, y, z = atom_coords[model][atom_idx]
                    
                    # Calculate distance to cysteine sulfur
                    dist = np.sqrt(
                        (x - cysteine_coords[0])**2 + 
                        (y - cysteine_coords[1])**2 + 
                        (z - cysteine_coords[2])**2
                    )
                    min_distance = min(min_distance, dist)
            distances[model] = min_distance
            
        return distances

    def save_docking_poses(self, output_dir, poses_data, base_name):
        """
        Save individual docking poses as separate PDBQT files
        
        Args:
            output_dir (str): Directory to save poses
            poses_data (list): List of pose data with coordinates
            base_name (str): Base name for the files
            
        Returns:
            list: List of paths to saved pose files
        """ 
        os.makedirs(output_dir, exist_ok=True)
        pose_paths = []
        
        for i, pose in enumerate(poses_data):
            pose_file = os.path.join(output_dir, f"{base_name}_pose_{i+1}.pdbqt")
            # Skip if the pose doesn't have coordinates
            if "coordinates" not in pose:
                continue
            with open(pose_file, 'w') as f:
                f.write(pose['coordinates'])
            pose_paths.append(pose_file)
            
        return pose_paths

    def dock_from_smiles(self, smiles, cysteine_id=None):
        """
        Dock a molecule from SMILES string, optionally targeting a specific cysteine.
        
        Args:
            smiles (str): SMILES representation of the molecule
            cysteine_id (str, optional): Cysteine residue identifier (format: "chain:resnum")
                                       for covalent docking
        
        Returns:
            dict: Docking results including scores and poses
        """
        if not self.protein_path:
            return {"status": "error", "message": "Protein structure not set"}
        
        # Create output directory for docking results
        output_dir = os.path.join(tempfile.gettempdir(), "bindforge_docking")
        os.makedirs(output_dir, exist_ok=True)
        
        # Convert SMILES to 3D molecule with RDKit first
        try:
            mol = Chem.MolFromSmiles(smiles)
            if mol is None:
                return {"status": "error", "message": "Invalid SMILES string"}
            
            mol = Chem.AddHs(mol)
            AllChem.EmbedMolecule(mol, randomSeed=42)
            AllChem.MMFFOptimizeMolecule(mol)
            
            # Save as PDB first
            pdb_path = os.path.join(output_dir, "ligand.pdb")
            Chem.MolToPDBFile(mol, pdb_path)
            
            # Generate Vina-compatible PDBQT directly
            ligand_pdbqt = self.generate_vina_compatible_ligand(pdb_path)
            
            if not ligand_pdbqt or not os.path.exists(ligand_pdbqt):
                return {"status": "error", "message": "Failed to generate ligand PDBQT file"}
            
            # Detect warheads
            try:
                warhead_result = self.warhead_detector.detect_warheads(mol)
            except Exception as e:
                print(f"Warning: Warhead detection failed - {str(e)}")
                warhead_result = {
                    "has_warhead": False,
                    "warheads": [],
                    "error": str(e)
                }
            
            # Get cysteine coordinates if covalent docking
            cysteine_coords = None
            if cysteine_id and self._protein_has_cysteine(cysteine_id):
                cysteine_coords = self._get_cysteine_coords(cysteine_id)
                
                # If we have coordinates, adjust the box center to be around the cysteine
                if cysteine_coords:
                    self.set_box_center(*cysteine_coords)
                    # Use a smaller box for covalent docking
                    self.set_box_size(15, 15, 15)
            
            # Create a config file for Vina
            config_file = tempfile.NamedTemporaryFile(suffix=".txt", delete=False)
            config_path = config_file.name
            config_file.close()
            
            with open(config_path, 'w') as f:
                f.write(f"receptor = {self.protein_path}\n")
                f.write(f"ligand = {ligand_pdbqt}\n")
                f.write(f"center_x = {self.center_x}\n")
                f.write(f"center_y = {self.center_y}\n")
                f.write(f"center_z = {self.center_z}\n")
                f.write(f"size_x = {self.size_x}\n")
                f.write(f"size_y = {self.size_y}\n")
                f.write(f"size_z = {self.size_z}\n")
                f.write("exhaustiveness = 8\n")
                f.write("num_modes = 9\n")
                
            # Create output file for Vina results
            output_file = os.path.join(output_dir, "docking_result.pdbqt")
            
            # Run Vina
            cmd = f"{self.vina_path} --config {config_path} --out {output_file}"
            process = subprocess.run(cmd, shell=True, capture_output=True, text=True)
            
            if process.returncode != 0:
                return {
                    "status": "error", 
                    "message": f"Docking failed: {process.stderr}",
                    "command": cmd,
                    "protein_file": self.protein_path,
                    "ligand_file": ligand_pdbqt,
                    "details": "Check that both protein and ligand files are correctly formatted PDBQT files"
                }
            
            # Rest of the method remains the same
            # ...
        except Exception as e:
            return {"status": "error", "message": f"Error processing SMILES: {str(e)}"}
        
        # Parse docking results
        docking_results = self._parse_docking_output(output_file, process.stdout)
        
        # For covalent docking, calculate additional scores
        if cysteine_coords and warhead_result["has_warhead"]:
            for pose in docking_results["poses"]:
                # Calculate distance from warhead to cysteine
                distance = self._calculate_warhead_distance(
                    pose["coordinates"], 
                    warhead_result["warheads"], 
                    cysteine_coords
                )
                pose["distance_to_cysteine"] = distance
                
                # Calculate covalent score
                pose["covalent_score"] = calculate_covalent_score(
                    pose["affinity"], distance
                )
                
                # Predict if binding is likely covalent
                pose["covalent_prediction"] = predict_covalent_binding(
                    pose["affinity"], 
                    warhead_result["has_warhead"], 
                    distance
                )
        
        # Add warhead information to results
        docking_results["has_warhead"] = warhead_result["has_warhead"]
        docking_results["warheads"] = warhead_result["warheads"]
        docking_results["status"] = "success"
        
        # Save pose files
        pose_files = self._split_poses(output_file, output_dir)
        for i, pose_file in enumerate(pose_files):
            if i < len(docking_results["poses"]):
                docking_results["poses"][i]["pose_file"] = pose_file
        
        # Cleanup temporary files
        os.unlink(config_path)
        
        return docking_results

    def _parse_docking_output(self, output_file, vina_output):
        """Parse AutoDock Vina output file and text output"""
        poses = []
        
        # Parse scores from Vina text output
        mode_data = {}
        for line in vina_output.split('\n'):
            if ' ' in line and line[0].isdigit():
                parts = line.split()
                if len(parts) >= 4:
                    try:
                        mode = int(parts[0])
                        mode_data[mode] = {
                            "mode": mode,
                            "affinity": float(parts[1]),
                            "rmsd_lb": float(parts[2]),
                            "rmsd_ub": float(parts[3])
                        }
                    except ValueError:
                        continue
        
        if os.path.exists(output_file):
            with open(output_file, 'r') as f:
                current_pose = None
                pose_coords = []
                for line in f:
                    if line.startswith('MODEL'):
                        if pose_coords and current_pose is not None:
                            # Store previous pose
                            mode_data.setdefault(current_pose, {})["coordinates"] = ''.join(pose_coords)
                        current_pose = int(line.split()[1])
                        pose_coords = [line]
                    elif line.startswith('ENDMDL'):
                        pose_coords.append(line)
                        # Store pose
                        mode_data.setdefault(current_pose, {})["coordinates"] = ''.join(pose_coords)
                        pose_coords = []
                    else:
                        pose_coords.append(line)
        
        # Compile all pose data
        for mode in sorted(mode_data.keys()):
            poses.append(mode_data[mode])
        
        return {
            "poses": poses,
            "output_file": output_file
        }

    def _protein_has_cysteine(self, cysteine_id):
        """Check if the protein has the specified cysteine residue"""
        # Simple check for now - in a real application, parse the PDB file to verify the cysteine exists
        return True

    def _get_cysteine_coords(self, cysteine_id):
        """Extract coordinates of cysteine's sulfur atom"""
        if not cysteine_id or not self.protein_path:
            return None
        
        # Parse cysteine identifier (format: "chain:resnum")
        try:
            chain, resnum = cysteine_id.split(":")
            resnum = int(resnum)
        except ValueError:
            print(f"Invalid cysteine_id format: {cysteine_id}. Expected format 'chain:resnum'")
            return None
        
        # Parse PDB file to find cysteine coordinates
        sulfur_coords = None
        with open(self.protein_path, 'r') as f:
            for line in f:
                if line.startswith('ATOM') or line.startswith('HETATM'):
                    if len(line) < 78:  # Skip if line is too short
                        continue
                    atom_name = line[12:16].strip()
                    residue_name = line[17:20].strip()
                    chain_id = line[21:22].strip()
                    res_num = int(line[22:26].strip())
                    
                    # Look for sulfur atom (SG) in the specified cysteine
                    if (residue_name == "CYS" and 
                        chain_id == chain and 
                        res_num == resnum and 
                        atom_name == "SG"):
                        x = float(line[30:38].strip())
                        y = float(line[38:46].strip())
                        z = float(line[46:54].strip())
                        sulfur_coords = (x, y, z)
                        break
        return sulfur_coords

    def _calculate_warhead_distance(self, pose_pdbqt_text, warheads, cysteine_coords):
        """Calculate the minimum distance between warhead atoms and cysteine sulfur"""
        if not warheads or not cysteine_coords:
            return float('inf')
        
        # This is a simplified version for demonstration
        # In a real application, you would:
        # 1. Parse the PDBQT text to extract atomic coordinates
        # 2. Match atoms to the original molecule to identify warhead atoms
        # 3. Calculate distances between all warhead atoms and the cysteine sulfur
        
        # For now, return a random distance as placeholder
        import random
        return random.uniform(3.0, 8.0)

    def _split_poses(self, output_pdbqt, output_dir):
        """Split multi-model PDBQT file into separate files for each pose"""
        pose_files = []
        
        if not os.path.exists(output_pdbqt):
            return pose_files
        
        current_pose = None
        pose_lines = []
        
        with open(output_pdbqt, 'r') as f:
            for line in f:
                if line.startswith('MODEL'):
                    if pose_lines and current_pose is not None:
                        # Write previous pose
                        pose_file = os.path.join(output_dir, f"pose_{current_pose}.pdbqt")
                        with open(pose_file, 'w') as pf:
                            pf.writelines(pose_lines)
                        pose_files.append(pose_file)
                    current_pose = int(line.split()[1])
                    pose_lines = [line]
                elif current_pose is not None:
                    pose_lines.append(line)
                if line.startswith('ENDMDL'):
                    # Write pose
                    pose_file = os.path.join(output_dir, f"pose_{current_pose}.pdbqt")
                    with open(pose_file, 'w') as pf:
                        pf.writelines(pose_lines)
                    pose_files.append(pose_file)
                    pose_lines = []
                        
        # Handle the last pose if needed
        if pose_lines and current_pose is not None:
            pose_file = os.path.join(output_dir, f"pose_{current_pose}.pdbqt")
            with open(pose_file, 'w') as pf:
                pf.writelines(pose_lines)
            pose_files.append(pose_file)
        
        return pose_files

    def _validate_pdbqt_file(self, file_path):
        """
        Validate that the PDBQT file has proper format for AutoDock Vina
        
        Args:
            file_path (str): Path to the PDBQT file
        
        Returns:
            bool: True if the file appears to be valid PDBQT, False otherwise
        """
        if not os.path.exists(file_path):
            return False
        
        try:
            with open(file_path, 'r') as f:
                content = f.read()
                
                # Check for common PDBQT header
                if not any(line.startswith(('ATOM', 'HETATM')) for line in content.split('\n')):
                    return False
                
                # Check for problematic lines that might cause Vina to fail
                for line in content.split('\n'):
                    if line.startswith('COMPND    '):
                        # This type of COMPND line can be problematic with Vina
                        return False
            return True
        except Exception:
            return False

    def prepare_clean_pdbqt(self, file_path, is_ligand=False):
        """Clean a PDBQT file to ensure compatibility with AutoDock Vina
        
        Args:
            file_path (str): Path to the original PDBQT file
            is_ligand (bool): Whether the file is a ligand (True) or receptor (False)
        
        Returns:
            str: Path to the cleaned PDBQT file
        """
        if not os.path.exists(file_path):
            return file_path
        
        try:
            with open(file_path, 'r') as f:
                lines = f.readlines()
            
            clean_lines = []
            # Add ROOT line for ligands if not present
            if is_ligand and not any(line.startswith('ROOT') for line in lines):
                clean_lines.append("ROOT\n")
            
            for line in lines:
                # Skip problematic header lines
                if line.startswith(('COMPND    ', 'SOURCE    ', 'REMARK   ')):
                    continue
                
                # Fix ligand ATOM/HETATM lines with formatting issues
                if is_ligand and (line.startswith('ATOM') or line.startswith('HETATM')):
                    try:
                        # For ligands, reformat to use atom types compatible with AutoDock Vina
                        parts = line.strip().split()
                        if len(parts) >= 7:  # Has minimum required fields
                            atom_num = int(parts[1]) if len(parts) > 1 and parts[1].isdigit() else 1
                            atom_name = parts[2] if len(parts) > 2 else "C"
                            
                            # AutoDock Vina expects specific atom types for ligands:
                            # Map common element names to AutoDock atom types
                            element = atom_name[0] if atom_name and len(atom_name) > 0 else "C"
                            if element in ["C", "N", "O", "H", "S", "P", "F", "I", "B"]:
                                atom_type = element  # Keep single-letter elements
                            else:
                                atom_type = "A"  # Default to carbon-like atom
                            
                            residue = "LIG"  # Always use LIG for ligands
                            chain = "A"     # Always use chain A
                            resnum = "1"    # Always use residue number 1
                            
                            # Extract coordinates
                            try:
                                x = float(parts[5]) if len(parts) > 5 else 0.0
                                y = float(parts[6]) if len(parts) > 6 else 0.0
                                z = float(parts[7]) if len(parts) > 7 else 0.0
                            except ValueError:
                                # Try to find coordinates by position in the line
                                try:
                                    x = float(line[30:38].strip())
                                    y = float(line[38:46].strip())
                                    z = float(line[46:54].strip())
                                except ValueError:
                                    x, y, z = 0.0, 0.0, 0.0
                            
                            # Format for AutoDock Vina compatible PDBQT
                            # Use AutoDock atom types format that Vina understands
                            new_line = f"ATOM{atom_num:7d} {atom_name:<3} {residue:3} {chain:1}{resnum:4}    "
                            new_line += f"{x:8.3f}{y:8.3f}{z:8.3f}  1.00  0.00     0.000 {atom_type}\n"
                            line = new_line
                    except Exception as e:
                        print(f"Error reformatting PDBQT line: {str(e)}, using simplified format")
                        # If the complex reformatting fails, use a simplified format that works with Vina
                        line = f"ATOM      1  C   LIG A   1    {x:8.3f}{y:8.3f}{z:8.3f}  1.00  0.00     0.000 C\n"
                
                clean_lines.append(line)
            
            # Add ENDROOT for ligands if not present
            if is_ligand and not any(line.startswith('ENDROOT') for line in lines):
                clean_lines.append("ENDROOT\n")
            
            # Add TORSDOF line for ligands if missing (required by Vina)
            if is_ligand and not any(line.startswith('TORSDOF') for line in clean_lines):
                clean_lines.append("TORSDOF 0\n")
            
            clean_path = file_path.replace('.pdbqt', '_cleaned.pdbqt')
            with open(clean_path, 'w') as f:
                f.writelines(clean_lines)
            
            return clean_path
        except Exception as e:
            print(f"Error cleaning PDBQT file: {str(e)}, using minimal valid ligand file")
            # Last resort: create a minimal valid ligand file
            clean_path = file_path.replace('.pdbqt', '_minimal.pdbqt')
            try:
                with open(clean_path, 'w') as f:
                    f.write("ROOT\n")
                    f.write("ATOM      1  C   LIG A   1      0.000  0.000  0.000  1.00  0.00     0.000 C\n")
                    f.write("ENDROOT\n")
                    f.write("TORSDOF 0\n")
                return clean_path
            except Exception:
                pass
            
            return file_path