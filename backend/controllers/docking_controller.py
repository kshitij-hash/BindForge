import os
import tempfile
import subprocess
from pathlib import Path
from rdkit import Chem
from rdkit.Chem import AllChem
import numpy as np
import shutil
import uuid

class WarheadDetector:
    """Simple class to detect possible reactive warheads in molecules"""
    
    def __init__(self):
        # Common warhead SMARTS patterns
        self.warhead_smarts = {
            "acrylamide": "[CX3]=[CX3]C(=O)[NX3]",
            "chloroacetamide": "ClC[CX3](=O)[NX3]",
            "vinyl_sulfone": "[CX3]=[CX3][SX4](=[OX1])(=[OX1])",
            "alpha_beta_unsaturated": "[CX3]=[CX3]C=O", 
            "michael_acceptor": "[CX3]=[CX3][CX3]=[OX1]",
            "epoxide": "[C-0;R1][O;R1][C-0;R1]",
            "nitrile": "[CX2]#[NX1]",
            "beta_lactone": "C1OC(=O)C1",
        }
    
    def detect_warheads(self, mol):
        """
        Detect possible reactive warheads in a molecule
        
        Args:
            mol: RDKit molecule or SMILES string
            
        Returns:
            dict: Dictionary with detection results
        """
        # Convert SMILES to molecule if necessary
        if isinstance(mol, str):
            mol = Chem.MolFromSmiles(mol)
            if mol is None:
                return {"has_warhead": False, "warheads": [], "error": "Invalid SMILES"}
        
        warheads_found = []
        
        for name, smarts in self.warhead_smarts.items():
            pattern = Chem.MolFromSmarts(smarts)
            if pattern and mol.HasSubstructMatch(pattern):
                matches = mol.GetSubstructMatches(pattern)
                warheads_found.append({
                    "type": name,
                    "smarts": smarts,
                    "atom_indices": [list(match) for match in matches]
                })
        
        return {
            "has_warhead": len(warheads_found) > 0,
            "warheads": warheads_found
        }


def calculate_covalent_score(affinity, distance):
    """
    Calculate a composite score for covalent binding potential
    
    Args:
        affinity (float): Binding affinity/docking score
        distance (float): Distance to reactive cysteine
        
    Returns:
        float: Covalent binding score
    """
    # Distance penalty factor (higher distance = more penalty)
    if distance < 3.5:
        distance_factor = 1.0
    elif distance < 5.0:
        distance_factor = 0.8
    elif distance < 7.0:
        distance_factor = 0.4
    else:
        distance_factor = 0.1
    
    # Affinity contribution (negative scores are better)
    affinity_component = min(1.0, max(0.0, (-affinity - 4) / 6))
    
    # Combined score (higher is better)
    score = affinity_component * distance_factor * 10
    
    return score


def predict_covalent_binding(affinity, has_warhead, distance):
    """
    Predict likelihood of covalent binding based on score, distance and warhead presence
    
    Args:
        affinity (float): Binding affinity/docking score
        has_warhead (bool): Whether molecule has a warhead
        distance (float): Distance to reactive cysteine
        
    Returns:
        str: "likely" or "unlikely"
    """
    if not has_warhead:
        return "unlikely"
    
    if distance > 8.0:
        return "unlikely"
    
    # Calculate covalent score
    score = calculate_covalent_score(affinity, distance)
    
    # Decision threshold
    return "likely" if score > 4.0 else "unlikely"


class DockingController:
    """Controller for molecular docking operations"""
    
    def __init__(self, vina_path="vina"):
        """
        Initialize the docking controller
        
        Args:
            vina_path (str): Path to AutoDock Vina executable
        """
        self.vina_path = vina_path
        self.protein_path = None
        
        # Default box size and center
        self.center_x = 0
        self.center_y = 0
        self.center_z = 0
        self.size_x = 20
        self.size_y = 20
        self.size_z = 20
        
        # Initialize working directory for docking results
        self.work_dir = os.path.join(tempfile.gettempdir(), f"bindforge_docking_{uuid.uuid4()}")
        os.makedirs(self.work_dir, exist_ok=True)
        
        # Create upload directory structure if running as standalone
        self.upload_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "../uploads"))
        self.poses_dir = os.path.join(self.upload_dir, "docking_poses")
        os.makedirs(self.poses_dir, exist_ok=True)
        
        # Initialize warhead detector
        self.warhead_detector = WarheadDetector()
    
    def set_protein(self, protein_path):
        """
        Set protein structure for docking
        
        Args:
            protein_path (str): Path to protein structure file (PDB or PDBQT)
            
        Returns:
            str: Path to the prepared protein file
        """
        if not os.path.exists(protein_path):
            raise FileNotFoundError(f"Protein file not found: {protein_path}")
        
        # Copy the file to the working directory
        protein_basename = os.path.basename(protein_path)
        protein_copy = os.path.join(self.work_dir, f"receptor_{protein_basename}")
        shutil.copy2(protein_path, protein_copy)
        
        # Process file based on format
        if protein_copy.lower().endswith('.pdb'):
            # Convert PDB to PDBQT using Open Babel
            pdbqt_path = os.path.splitext(protein_copy)[0] + '.pdbqt'
            
            try:
                self._run_command(f"obabel {protein_copy} -O {pdbqt_path} -xr")
                if os.path.exists(pdbqt_path):
                    self.protein_path = pdbqt_path
                else:
                    raise FileNotFoundError("Failed to convert PDB to PDBQT")
            except Exception as e:
                raise RuntimeError(f"Error converting protein to PDBQT format: {str(e)}")
        elif protein_copy.lower().endswith('.pdbqt'):
            self.protein_path = protein_copy
        else:
            raise ValueError(f"Unsupported protein file format: {protein_path}")
        
        return self.protein_path
    
    def _run_command(self, cmd, check=True):
        """
        Run a shell command safely
        
        Args:
            cmd (str): Command to run
            check (bool): Whether to check for return code
            
        Returns:
            tuple: (stdout, stderr, return_code)
        """
        process = subprocess.run(
            cmd, 
            shell=True, 
            capture_output=True,
            text=True
        )
        
        if check and process.returncode != 0:
            raise RuntimeError(f"Command failed with error: {process.stderr}")
            
        return process.stdout, process.stderr, process.returncode
    
    def _prepare_ligand(self, smiles):
        """
        Prepare ligand for docking from SMILES
        
        Args:
            smiles (str): SMILES string of the ligand
            
        Returns:
            tuple: (pdbqt_path, mol)
        """
        try:
            # Generate RDKit molecule
            mol = Chem.MolFromSmiles(smiles)
            if mol is None:
                raise ValueError("Invalid SMILES string")
            
            # Add hydrogens and generate 3D coordinates
            mol = Chem.AddHs(mol)
            AllChem.EmbedMolecule(mol, randomSeed=42)
            AllChem.MMFFOptimizeMolecule(mol)
            
            # Save as PDB
            ligand_name = f"ligand_{uuid.uuid4().hex[:8]}"
            pdb_path = os.path.join(self.work_dir, f"{ligand_name}.pdb")
            Chem.MolToPDBFile(mol, pdb_path)
            
            # Convert to PDBQT using Open Babel
            pdbqt_path = os.path.join(self.work_dir, f"{ligand_name}.pdbqt")
            self._run_command(f"obabel {pdb_path} -O {pdbqt_path} -xn --partialcharge gasteiger")
            
            if not os.path.exists(pdbqt_path) or os.path.getsize(pdbqt_path) == 0:
                # Try alternate conversion approach if first fails
                self._run_command(f"obabel {pdb_path} -O {pdbqt_path} -xn")
                
                if not os.path.exists(pdbqt_path) or os.path.getsize(pdbqt_path) == 0:
                    # Create minimal valid PDBQT as last resort
                    self._create_minimal_pdbqt(mol, pdbqt_path)
            
            return pdbqt_path, mol
            
        except Exception as e:
            raise RuntimeError(f"Error preparing ligand: {str(e)}")
    
    def _create_minimal_pdbqt(self, mol, output_path):
        """
        Create a minimal valid PDBQT file from an RDKit molecule
        
        Args:
            mol: RDKit molecule
            output_path (str): Path to save PDBQT file
        """
        with open(output_path, 'w') as f:
            f.write("ROOT\n")
            
            # Get atom positions
            conf = mol.GetConformer()
            for i, atom in enumerate(mol.GetAtoms()):
                pos = conf.GetAtomPosition(i)
                element = atom.GetSymbol()
                
                # Ensure element is valid for AutoDock
                if element not in ["C", "N", "O", "H", "S", "P", "F", "Cl", "Br", "I"]:
                    element = "C"
                
                # Write atom in PDBQT format
                f.write(f"ATOM  {i+1:5d}  {element:<2}  LIG A   1    {pos.x:8.3f}{pos.y:8.3f}{pos.z:8.3f}  1.00  0.00    {element:>2}\n")
                
            f.write("ENDROOT\n")
            f.write("TORSDOF 0\n")
    
    def _get_cysteine_coords(self, cysteine_id):
        """
        Get coordinates of cysteine sulfur atom
        
        Args:
            cysteine_id (str): Cysteine identifier in format "chain:resnum"
            
        Returns:
            tuple: (x, y, z) coordinates or None
        """
        if not cysteine_id or not self.protein_path:
            return None
            
        try:
            # Parse cysteine identifier
            chain, resnum = cysteine_id.split(":")
            resnum = int(resnum)
            
            # Use PDB file if available, otherwise use PDBQT
            protein_file = self.protein_path
            if protein_file.endswith(".pdbqt") and os.path.exists(protein_file.replace(".pdbqt", ".pdb")):
                protein_file = protein_file.replace(".pdbqt", ".pdb")
            
            # Find sulfur atom coordinates
            with open(protein_file, 'r') as f:
                for line in f:
                    if line.startswith(('ATOM', 'HETATM')):
                        if len(line) < 54: # Ensure line is long enough
                            continue
                        
                        try:
                            atom_name = line[12:16].strip()
                            residue_name = line[17:20].strip()
                            chain_id = line[21:22].strip()
                            res_num = int(line[22:26].strip())
                            
                            # Look for sulfur atom in cysteine
                            if (residue_name == "CYS" and 
                                chain_id == chain and 
                                res_num == resnum and 
                                atom_name == "SG"):
                                
                                x = float(line[30:38].strip())
                                y = float(line[38:46].strip())
                                z = float(line[46:54].strip())
                                
                                # Center the box on the sulfur atom
                                self.center_x = x
                                self.center_y = y
                                self.center_z = z
                                # Use smaller box for covalent docking
                                self.size_x = 15
                                self.size_y = 15
                                self.size_z = 15
                                
                                return (x, y, z)
                        except (ValueError, IndexError):
                            continue
            
            return None
        except Exception as e:
            print(f"Error finding cysteine: {str(e)}")
            return None
    
    def dock_from_smiles(self, smiles, cysteine_id=None):
        """
        Perform docking of a molecule from SMILES
        
        Args:
            smiles (str): SMILES string of the ligand
            cysteine_id (str, optional): Cysteine ID for covalent docking
            
        Returns:
            dict: Docking results formatted for frontend
        """
        if not self.protein_path:
            return {"status": "error", "message": "Protein structure not set"}
            
        try:
            # Prepare the ligand
            ligand_path, mol = self._prepare_ligand(smiles)
            
            # Detect warheads if relevant
            warhead_result = self.warhead_detector.detect_warheads(mol)
            
            # Get cysteine coordinates for covalent docking
            cysteine_coords = None
            if cysteine_id:
                cysteine_coords = self._get_cysteine_coords(cysteine_id)
            
            # Run Vina docking
            output_file, log_output = self._run_vina_docking(ligand_path)
            
            # Process the results
            results = self._process_docking_results(output_file, log_output, warhead_result, cysteine_coords)
            
            return results
            
        except Exception as e:
            return {"status": "error", "message": str(e)}
    
    def _run_vina_docking(self, ligand_path):
        """
        Run AutoDock Vina docking
        
        Args:
            ligand_path (str): Path to ligand PDBQT file
            
        Returns:
            tuple: (output_file_path, log_output)
        """
        # Create config file
        config_path = os.path.join(self.work_dir, "vina_config.txt")
        output_path = os.path.join(self.work_dir, "docking_output.pdbqt")
        
        with open(config_path, 'w') as f:
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
        
        # Run Vina
        cmd = f"{self.vina_path} --config {config_path} --out {output_path}"
        stdout, stderr, retcode = self._run_command(cmd)
        
        if retcode != 0 or not os.path.exists(output_path) or os.path.getsize(output_path) == 0:
            raise RuntimeError(f"Vina docking failed: {stderr}")
        
        return output_path, stdout
    
    def _process_docking_results(self, output_file, log_output, warhead_result, cysteine_coords=None):
        """
        Process docking results and format for frontend
        
        Args:
            output_file (str): Path to Vina output file
            log_output (str): Vina stdout log
            warhead_result (dict): Warhead detection results
            cysteine_coords (tuple): Coordinates of target cysteine
            
        Returns:
            dict: Formatted docking results
        """
        # Parse log for scores
        scores = []
        for line in log_output.split('\n'):
            if line.strip().startswith('1 '):  # First pose score line
                parts = line.strip().split()
                if len(parts) >= 4:
                    scores.append({
                        'mode': int(parts[0]),
                        'affinity': float(parts[1]),
                        'rmsd_lb': float(parts[2]),
                        'rmsd_ub': float(parts[3])
                    })
        
        # Extract poses from output file
        poses = self._split_poses(output_file)
        best_affinity = float('inf')
        
        # Calculate distance to cysteine for each pose
        min_distance = float('inf')
        for pose in poses:
            # Get best affinity
            if pose['affinity'] < best_affinity:
                best_affinity = pose['affinity']
            
            # Calculate distance to cysteine for covalent docking
            if cysteine_coords and warhead_result["has_warhead"]:
                distance = self._calculate_warhead_distance(pose['coordinates'], cysteine_coords)
                pose['distance_to_cysteine'] = distance
                
                # Calculate covalent score
                covalent_score = calculate_covalent_score(pose['affinity'], distance)
                pose['covalent_score'] = covalent_score
                
                # Predict covalent binding
                covalent_prediction = predict_covalent_binding(
                    pose['affinity'], 
                    warhead_result["has_warhead"],
                    distance
                )
                pose['covalent_prediction'] = covalent_prediction
                
                # Track minimum distance
                if distance < min_distance:
                    min_distance = distance
        
        # Determine covalent potential
        covalent_potential = "Low"
        if warhead_result["has_warhead"] and min_distance < 5.0:
            covalent_potential = "High"
        
        # Format the response for the frontend
        results = {
            "status": "success",
            "best_affinity": best_affinity,
            "poses": poses,
            "has_warhead": warhead_result["has_warhead"],
            "warheads": warhead_result["warheads"],
            "covalent_potential": covalent_potential,
        }
        
        # Add warhead distance if we calculated it
        if min_distance != float('inf'):
            results["warhead_distance"] = min_distance
        
        return results
    
    def _split_poses(self, output_file):
        """
        Split Vina output file into separate pose files
        
        Args:
            output_file (str): Path to Vina output file
            
        Returns:
            list: List of pose dictionaries
        """
        poses = []
        current_pose = None
        pose_lines = []
        
        with open(output_file, 'r') as f:
            for line in f:
                if line.startswith('MODEL'):
                    # Save previous pose
                    if current_pose is not None and pose_lines:
                        pose_content = ''.join(pose_lines)
                        poses.append({
                            'mode': current_pose,
                            'coordinates': pose_content
                        })
                        pose_lines = []
                    
                    # Start new pose
                    current_pose = int(line.split()[1])
                    pose_lines = [line]
                elif line.startswith('ENDMDL'):
                    pose_lines.append(line)
                    # Save this pose
                    pose_content = ''.join(pose_lines)
                    
                    # Extract affinity from Vina log
                    affinity = 0
                    for i in range(len(poses) + 1):
                        if i + 1 == current_pose:
                            affinity = -10.0  # Default value
                            break
                    
                    # Save pose file
                    pose_file = os.path.join(self.poses_dir, f"pose_{uuid.uuid4().hex[:8]}.pdbqt")
                    with open(pose_file, 'w') as pf:
                        pf.write(pose_content)
                    
                    poses.append({
                        'mode': current_pose,
                        'affinity': affinity,
                        'coordinates': pose_content,
                        'pose_file': pose_file
                    })
                    
                    pose_lines = []
                else:
                    pose_lines.append(line)
        
        # Parse Vina output to get accurate affinities
        with open(output_file, 'r') as f:
            vina_log = f.read()
            
            for pose in poses:
                mode = pose['mode']
                # Looking for lines like "   1       -7.2      0.000      0.000"
                for line in vina_log.split("\n"):
                    if line.strip().startswith(f"{mode} "):
                        parts = line.strip().split()
                        if len(parts) >= 2:
                            try:
                                pose['affinity'] = float(parts[1])
                            except ValueError:
                                pass
        
        return poses
    
    def _calculate_warhead_distance(self, pose_pdbqt, cysteine_coords):
        """
        Calculate minimum distance between pose atoms and cysteine sulfur
        
        Args:
            pose_pdbqt (str): PDBQT content of the pose
            cysteine_coords (tuple): (x, y, z) of cysteine sulfur
            
        Returns:
            float: Minimum distance in Angstroms
        """
        min_distance = float('inf')
        
        # Parse atom coordinates from PDBQT
        for line in pose_pdbqt.split('\n'):
            if line.startswith(('ATOM', 'HETATM')):
                try:
                    x = float(line[30:38])
                    y = float(line[38:46])
                    z = float(line[46:54])
                    
                    # Calculate distance to cysteine sulfur
                    cx, cy, cz = cysteine_coords
                    distance = np.sqrt((x - cx)**2 + (y - cy)**2 + (z - cz)**2)
                    
                    min_distance = min(min_distance, distance)
                except (ValueError, IndexError):
                    continue
        
        return min_distance