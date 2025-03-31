import logging
import os
import tempfile
from typing import List, Optional, Tuple, Union

import numpy as np
from openbabel import pybel

logger = logging.getLogger(__name__)


def process_smiles(
    smiles: str, output_dir: str, molecule_name: Optional[str] = None
) -> dict:
    """
    Process a SMILES string to generate 3D structures and PDBQT files

    Args:
        smiles (str): SMILES representation of the molecule
        output_dir (str): Directory to save output files
        molecule_name (str, optional): Name for the molecule. If None, will use a hash of the SMILES

    Returns:
        dict: Dictionary with paths to generated files
    """
    try:
        logger.info(f"Processing SMILES: {smiles}")

        # Create molecule from SMILES
        mol = pybel.readstring("smi", smiles)

        # Generate name if not provided
        if molecule_name is None:
            molecule_name = f"molecule_{abs(hash(smiles)) % 10000}"

        # Create output paths
        os.makedirs(output_dir, exist_ok=True)
        pdb_path = os.path.join(output_dir, f"{molecule_name}.pdb")
        pdbqt_path = os.path.join(output_dir, f"{molecule_name}.pdbqt")

        # Generate 3D coordinates
        mol.make3D(forcefield="mmff94", steps=500)

        # Add hydrogens
        mol.addh()

        # Perform energy minimization
        mol.localopt(forcefield="mmff94", steps=500)

        # Save as PDB
        mol.write("pdb", pdb_path, overwrite=True)
        logger.info(f"Saved 3D structure to {pdb_path}")

        # Convert to PDBQT (for docking)
        convert_to_pdbqt_ligand(pdb_path, pdbqt_path)
        logger.info(f"Converted to PDBQT: {pdbqt_path}")

        return {
            "smiles": smiles,
            "name": molecule_name,
            "pdb_path": pdb_path,
            "pdbqt_path": pdbqt_path,
        }

    except Exception as e:
        logger.error(f"Error processing SMILES: {str(e)}")
        raise


def process_sdf(sdf_file_path: str, output_dir: str) -> List[dict]:
    """
    Process an SDF file to generate 3D structures and PDBQT files for each molecule

    Args:
        sdf_file_path (str): Path to SDF file
        output_dir (str): Directory to save output files

    Returns:
        list: List of dictionaries with paths to generated files for each molecule
    """
    try:
        logger.info(f"Processing SDF file: {sdf_file_path}")

        results = []
        os.makedirs(output_dir, exist_ok=True)

        # Read all molecules from SDF
        for idx, mol in enumerate(pybel.readfile("sdf", sdf_file_path)):
            # Get molecule name or generate one
            if mol.title:
                mol_name = mol.title.replace(" ", "_")
            else:
                mol_name = f"molecule_{idx}"

            # Clean name (remove special characters)
            mol_name = "".join(c if c.isalnum() or c == "_" else "_" for c in mol_name)

            # Output paths for this molecule
            pdb_path = os.path.join(output_dir, f"{mol_name}.pdb")
            pdbqt_path = os.path.join(output_dir, f"{mol_name}.pdbqt")

            # Check if 3D coordinates exist, if not generate them
            if not has_3d_coordinates(mol):
                logger.info(f"Generating 3D coordinates for {mol_name}")
                mol.make3D(forcefield="mmff94", steps=500)

            # Add hydrogens
            mol.addh()

            # Perform energy minimization
            mol.localopt(forcefield="mmff94", steps=500)

            # Save as PDB
            mol.write("pdb", pdb_path, overwrite=True)

            # Convert to PDBQT
            convert_to_pdbqt_ligand(pdb_path, pdbqt_path)

            # Get SMILES representation
            smiles = mol.write("smi").strip()

            results.append(
                {
                    "name": mol_name,
                    "smiles": smiles,
                    "pdb_path": pdb_path,
                    "pdbqt_path": pdbqt_path,
                }
            )

        logger.info(f"Processed {len(results)} molecules from SDF file")
        return results

    except Exception as e:
        logger.error(f"Error processing SDF file: {str(e)}")
        raise


def has_3d_coordinates(mol) -> bool:
    """
    Check if molecule already has 3D coordinates

    Args:
        mol: OpenBabel molecule object

    Returns:
        bool: True if molecule has 3D coordinates, False otherwise
    """
    # Get coordinates of first 3 atoms (if available)
    if mol.OBMol.NumAtoms() < 3:
        return False

    coords = []
    for i in range(3):
        atom = mol.OBMol.GetAtom(i + 1)
        coords.append((atom.GetX(), atom.GetY(), atom.GetZ()))

    # Calculate distances between these atoms
    distances = []
    for i in range(3):
        for j in range(i + 1, 3):
            dist = np.sqrt(sum((coords[i][k] - coords[j][k]) ** 2 for k in range(3)))
            distances.append(dist)

    # If all distances are 0 or very small, it's likely a 2D structure
    return not all(d < 0.1 for d in distances)


def convert_to_pdbqt_ligand(
    pdb_path: str, output_pdbqt_path: Optional[str] = None
) -> str:
    """
    Convert a ligand PDB file to PDBQT format for AutoDock Vina

    Args:
        pdb_path (str): Path to input PDB file
        output_pdbqt_path (str, optional): Path to save PDBQT file

    Returns:
        str: Path to PDBQT file
    """
    logger = logging.getLogger(__name__)

    try:
        # If no output path specified, create one
        if output_pdbqt_path is None:
            base_name = os.path.splitext(os.path.basename(pdb_path))[0]
            output_pdbqt_path = f"{base_name}_ligand.pdbqt"

        logger.info(f"Converting ligand to PDBQT: {pdb_path}")

        # Check if file exists
        if not os.path.exists(pdb_path):
            raise FileNotFoundError(f"Input PDB file not found: {pdb_path}")

        # Use OpenBabel to convert PDB to PDBQT format for a ligand
        mol = next(pybel.readfile("pdb", pdb_path))

        # Add hydrogens if missing
        mol.addh()

        # Compute Gasteiger charges - required for AutoDock
        pybel.ob.OBChargeModel.FindType("gasteiger").ComputeCharges(mol.OBMol)

        # Set AutoDock atom types
        mol.OBMol.AddPolarHydrogens()
        pybel.ob.OBAromaticTyper().AssignAromaticFlags(mol.OBMol)

        # This is important for ligands - set up all rotatable bonds
        # PDBQT format needs TORSDOF records for ligands
        conv = pybel.ob.OBConversion()
        conv.SetOutFormat("pdbqt")
        conv.AddOption("x", pybel.ob.OBConversion.OUTOPTIONS)  # Rigid fragment
        conv.AddOption("r", pybel.ob.OBConversion.OUTOPTIONS)  # Root atom detection

        # Write to PDBQT file
        conv.WriteFile(mol.OBMol, output_pdbqt_path)

        logger.info(f"Successfully converted ligand to PDBQT: {output_pdbqt_path}")
        return output_pdbqt_path

    except FileNotFoundError as e:
        logger.error(f"File error: {str(e)}")
        raise
    except StopIteration:
        logger.error(f"Could not read PDB file or file is empty: {pdb_path}")
        raise ValueError(f"Invalid or empty PDB file: {pdb_path}")
    except Exception as e:
        logger.error(f"Error converting to PDBQT: {str(e)}")
        raise


def batch_process_smiles(
    smiles_list: List[str], output_dir: str, names: Optional[List[str]] = None
) -> List[dict]:
    """
    Process multiple SMILES strings

    Args:
        smiles_list (list): List of SMILES strings
        output_dir (str): Directory to save output files
        names (list, optional): List of names for the molecules

    Returns:
        list: List of dictionaries with paths to generated files
    """
    results = []

    for i, smiles in enumerate(smiles_list):
        name = names[i] if names and i < len(names) else None
        try:
            result = process_smiles(smiles, output_dir, name)
            results.append(result)
        except Exception as e:
            logger.error(f"Error processing SMILES {smiles}: {str(e)}")
            results.append(
                {"smiles": smiles, "name": name or f"molecule_{i}", "error": str(e)}
            )

    return results
