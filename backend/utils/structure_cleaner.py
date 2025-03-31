import logging
import os
import tempfile
from collections import defaultdict

import numpy as np
from Bio.PDB import PDBIO, PDBParser, Select
from openbabel import pybel


class NonHetSelect(Select):
    """
    Select class to remove hetero atoms (ligands, water, etc)
    """

    def accept_residue(self, residue):
        # Return True if the residue is not a hetero atom/water
        return residue.id[0] == " "  # This selects only standard amino acids


def clean_structure(input_pdb_path, output_pdb_path=None, keep_ligands=None):
    """
    Clean PDB structure by:
    1. Removing water molecules and ligands (except those specified in keep_ligands)
    2. Adding hydrogens

    Args:
        input_pdb_path (str): Path to input PDB file
        output_pdb_path (str): Path to save cleaned PDB file (optional)
        keep_ligands (list): List of ligand residue names to keep (optional)

    Returns:
        str: Path to cleaned PDB file
    """
    logger = logging.getLogger(__name__)

    try:
        # If no output path specified, create one
        if output_pdb_path is None:
            base_name = os.path.splitext(os.path.basename(input_pdb_path))[0]
            output_pdb_path = f"{base_name}_cleaned.pdb"

        logger.info(f"Cleaning structure: {input_pdb_path}")
        logger.info(f"Output will be saved to: {output_pdb_path}")

        # Step 1: Remove waters and ligands using BioPython
        parser = PDBParser(QUIET=True)
        structure = parser.get_structure("protein", input_pdb_path)

        # Custom selector if we want to keep specific ligands
        if keep_ligands:

            class CustomSelect(Select):
                def accept_residue(self, residue):
                    # Keep standard amino acids and specified ligands
                    return residue.id[0] == " " or residue.resname in keep_ligands

            selector = CustomSelect()
        else:
            selector = NonHetSelect()

        # Save structure without hetero atoms
        io = PDBIO()
        io.set_structure(structure)

        # Create temporary file for intermediate result
        tmp_handle = tempfile.NamedTemporaryFile(suffix=".pdb", delete=False)
        tmp_path = tmp_handle.name
        tmp_handle.close()

        try:
            io.save(tmp_path, selector)

            # Step 2: Add hydrogens using OpenBabel
            try:
                mol = next(pybel.readfile("pdb", tmp_path))
                mol.addh()
                mol.write("pdb", output_pdb_path, overwrite=True)
                logger.info("Successfully cleaned structure and added hydrogens")
            except Exception as e:
                logger.error(f"Error adding hydrogens with OpenBabel: {str(e)}")
                raise

        finally:
            # Clean up temporary file
            if os.path.exists(tmp_path):
                os.remove(tmp_path)
                logger.debug(f"Removed temporary file: {tmp_path}")

        return output_pdb_path

    except Exception as e:
        logger.error(f"Error cleaning structure: {str(e)}")
        raise


def identify_cysteines(pdb_path):
    """
    Identify all cysteine residues in the PDB file

    Args:
        pdb_path (str): Path to PDB file

    Returns:
        list: List of cysteine residues with chain and residue number
    """
    parser = PDBParser(QUIET=True)
    structure = parser.get_structure("protein", pdb_path)

    cysteines = []

    for model in structure:
        for chain in model:
            chain_id = chain.get_id()
            for residue in chain:
                if residue.get_resname() == "CYS":
                    # Get residue number
                    res_id = residue.get_id()[1]
                    cysteines.append(
                        {
                            "chain": chain_id,
                            "residue_number": res_id,
                            "residue_name": "CYS",
                        }
                    )

    return cysteines


def group_cysteines_by_chain(cysteines):
    """
    Group cysteine residues by chain

    Args:
        cysteines (list): List of cysteine residues

    Returns:
        dict: Dictionary with chains as keys and lists of cysteine residue numbers as values
    """
    chain_to_cysteines = defaultdict(list)

    for cys in cysteines:
        chain_to_cysteines[cys["chain"]].append(cys["residue_number"])

    return dict(chain_to_cysteines)


def calculate_cysteine_distances(pdb_path, cysteines):
    """
    Calculate distances between SG atoms of cysteine residues

    Args:
        pdb_path (str): Path to PDB file
        cysteines (list): List of cysteine residues

    Returns:
        list: List of dictionaries with cysteine pairs and their distances
    """
    parser = PDBParser(QUIET=True)
    structure = parser.get_structure("protein", pdb_path)

    # Get all cysteine SG atoms
    cys_atoms = {}
    for model in structure:
        for chain in model:
            chain_id = chain.get_id()
            for residue in chain:
                if residue.get_resname() == "CYS" and residue.get_id()[1] in [
                    c["residue_number"] for c in cysteines if c["chain"] == chain_id
                ]:
                    if "SG" in residue:
                        res_id = residue.get_id()[1]
                        cys_atoms[(chain_id, res_id)] = residue["SG"].get_coord()

    # Calculate distances between all cysteine SG atoms
    distances = []
    keys = list(cys_atoms.keys())
    for i in range(len(keys)):
        for j in range(i + 1, len(keys)):
            chain_i, res_i = keys[i]
            chain_j, res_j = keys[j]

            # Calculate Euclidean distance
            dist = np.linalg.norm(cys_atoms[keys[i]] - cys_atoms[keys[j]])

            distances.append(
                {
                    "cys1": {"chain": chain_i, "residue_number": res_i},
                    "cys2": {"chain": chain_j, "residue_number": res_j},
                    "distance": float(dist),
                }
            )

    return distances


def identify_potential_disulfide_bonds(distances, distance_threshold=3.0):
    """
    Identify potential disulfide bonds based on distance threshold

    Args:
        distances (list): List of dictionaries with cysteine pairs and distances
        distance_threshold (float): Maximum distance in Angstroms for potential disulfide bonds (default: 3.0)

    Returns:
        list: List of potential disulfide bonds
    """
    potential_bonds = []

    for dist_info in distances:
        if dist_info["distance"] <= distance_threshold:
            potential_bonds.append(
                {
                    "cys1": dist_info["cys1"],
                    "cys2": dist_info["cys2"],
                    "distance": dist_info["distance"],
                }
            )

    return potential_bonds


def analyze_cysteines(pdb_path, cysteines=None):
    """
    Comprehensive analysis of cysteines in a protein structure

    Args:
        pdb_path (str): Path to PDB file
        cysteines (list, optional): List of cysteine residues. If None, they will be identified from the structure.

    Returns:
        dict: Dictionary with cysteine analysis, including potential disulfide bonds
    """
    if cysteines is None:
        cysteines = identify_cysteines(pdb_path)

    chain_groups = group_cysteines_by_chain(cysteines)
    distances = calculate_cysteine_distances(pdb_path, cysteines)
    potential_disulfides = identify_potential_disulfide_bonds(distances)

    # Sort potential disulfides by distance
    potential_disulfides.sort(key=lambda x: x["distance"])

    return {
        "cysteines": cysteines,
        "chain_groups": chain_groups,
        "potential_disulfide_bonds": potential_disulfides,
    }


def clean_and_identify(input_pdb_path, output_pdb_path=None, analyze_cys=True):
    """
    Combines structure cleaning and cysteine identification and analysis

    Args:
        input_pdb_path (str): Path to input PDB file
        output_pdb_path (str): Path to save cleaned PDB file (optional)
        analyze_cys (bool): Whether to perform cysteine analysis (default: True)

    Returns:
        tuple: (cleaned_pdb_path, analysis_results)
    """
    cleaned_path = clean_structure(input_pdb_path, output_pdb_path)

    if analyze_cys:
        cysteines = identify_cysteines(cleaned_path)
        analysis_results = analyze_cysteines(cleaned_path, cysteines)
        return cleaned_path, analysis_results
    else:
        cysteines = identify_cysteines(cleaned_path)
        return cleaned_path, cysteines


def convert_to_pdbqt2(
    pdb_path, output_pdbqt_path=None, add_hydrogens=False, optimize=False
):
    """
    Convert a PDB file to PDBQT format for AutoDock Vina.

    Args:
        pdb_path (str): Path to input PDB file
        output_pdbqt_path (str): Path to save PDBQT file (optional)
        add_hydrogens (bool): Whether to add hydrogens if missing (default: False)
        optimize (bool): Whether to optimize structure geometry (default: False)

    Returns:
        str: Path to PDBQT file
    """
    logger = logging.getLogger(__name__)

    try:
        # If no output path specified, create one
        if output_pdbqt_path is None:
            base_name = os.path.splitext(os.path.basename(pdb_path))[0]
            output_pdbqt_path = f"{base_name}.pdbqt"

        logger.info(f"Converting structure to PDBQT: {pdb_path}")

        # Check if file exists
        if not os.path.exists(pdb_path):
            raise FileNotFoundError(f"Input PDB file not found: {pdb_path}")

        # Use OpenBabel to convert PDB to PDBQT format
        mol = next(pybel.readfile("pdb", pdb_path))

        # Add hydrogens only if requested (they might already be present)
        if add_hydrogens:
            mol.addh()

        # Only apply 3D optimization if specifically requested
        # For pre-structured PDB files, this is usually unnecessary
        if optimize:
            mol.make3D()

        # Compute Gasteiger charges - required for AutoDock
        pybel.ob.OBChargeModel.FindType("gasteiger").ComputeCharges(mol.OBMol)

        # Set AutoDock atom types
        mol.OBMol.AddPolarHydrogens()
        pybel.ob.OBAromaticTyper().AssignAromaticFlags(mol.OBMol)

        # Write to PDBQT file
        outfile = pybel.Outputfile("pdbqt", output_pdbqt_path, overwrite=True)
        outfile.write(mol)
        outfile.close()

        logger.info(f"Successfully converted PDB to PDBQT: {output_pdbqt_path}")
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


def convert_to_pdbqt_receptor(pdb_path, output_pdbqt_path=None, add_hydrogens=False):
    """
    Convert a protein PDB file to PDBQT format for AutoDock Vina as a RIGID RECEPTOR.

    This function is specifically optimized for protein structures like MAPKAPK2/MK2.

    Args:
        pdb_path (str): Path to input PDB file
        output_pdbqt_path (str): Path to save PDBQT file (optional)
        add_hydrogens (bool): Whether to add hydrogens if missing (default: False)

    Returns:
        str: Path to PDBQT file
    """
    logger = logging.getLogger(__name__)

    try:
        # If no output path specified, create one
        if output_pdbqt_path is None:
            base_name = os.path.splitext(os.path.basename(pdb_path))[0]
            output_pdbqt_path = f"{base_name}_receptor.pdbqt"

        logger.info(
            f"Converting protein structure to PDBQT receptor format: {pdb_path}"
        )

        # Check if file exists
        if not os.path.exists(pdb_path):
            raise FileNotFoundError(f"Input PDB file not found: {pdb_path}")

        # For proteins, it's best to use command-line tools directly
        # Check if we have obabel installed (OpenBabel command line tool)
        import subprocess
        import shutil

        obabel_path = shutil.which("obabel")
        if obabel_path:
            # Construct command with appropriate flags for a rigid receptor
            cmd = [
                obabel_path,
                pdb_path,
                "-opdbqt",
                "-O",
                output_pdbqt_path,
                "-xr",  # This flag treats the molecule as a rigid receptor
            ]

            # Add hydrogens if requested
            if add_hydrogens:
                cmd.append("-h")

            # Execute the command
            try:
                result = subprocess.run(
                    cmd,
                    check=True,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE,
                    text=True,
                )
                logger.info(
                    f"Successfully converted protein to PDBQT receptor: {output_pdbqt_path}"
                )
                logger.debug(f"OpenBabel output: {result.stdout}")

            except subprocess.CalledProcessError as e:
                logger.error(f"OpenBabel command failed: {e}")
                logger.error(f"Command output: {e.stdout}")
                logger.error(f"Command error: {e.stderr}")
                raise ValueError(f"OpenBabel conversion failed: {e}")

        else:
            # Fallback to pybel API if command line tool is not available
            logger.warning(
                "OpenBabel command line tool not found, using Python API as fallback"
            )

            mol = next(pybel.readfile("pdb", pdb_path))

            # Add hydrogens if requested
            if add_hydrogens:
                mol.addh()

            # Set necessary AutoDock properties without making all bonds rotatable
            pybel.ob.OBChargeModel.FindType("gasteiger").ComputeCharges(mol.OBMol)

            # This is critical - for proteins we don't want to set any rotatable bonds
            # We need to disable automatic TORSDO and ROOT setting
            # This is done by setting an option in the output file
            conv = pybel.ob.OBConversion()
            conv.SetOutFormat("pdbqt")
            conv.AddOption("r", pybel.ob.OBConversion.OUTOPTIONS)  # r for rigid
            conv.AddOption("x", pybel.ob.OBConversion.OUTOPTIONS)  # x for receptor

            # Write to PDBQT file using the configured conversion
            conv.WriteFile(mol.OBMol, output_pdbqt_path)

            logger.info(
                f"Successfully converted protein to PDBQT receptor: {output_pdbqt_path}"
            )

        return output_pdbqt_path

    except FileNotFoundError as e:
        logger.error(f"File error: {str(e)}")
        raise
    except StopIteration:
        logger.error(f"Could not read PDB file or file is empty: {pdb_path}")
        raise ValueError(f"Invalid or empty PDB file: {pdb_path}")
    except Exception as e:
        logger.error(f"Error converting protein to PDBQT: {str(e)}")
        raise


def clean_analyze_and_convert(
    input_pdb_path, output_dir=None, analyze_cys=True, is_protein=True
):
    """
    Complete protein preparation workflow:
    1. Clean structure
    2. Identify cysteines
    3. Convert to PDBQT format

    Args:
        input_pdb_path (str): Path to input PDB file
        output_dir (str): Directory to save output files (optional)
        analyze_cys (bool): Whether to perform cysteine analysis (default: True)
        is_protein (bool): Whether the input is a protein structure (default: True)

    Returns:
        dict: Dictionary with paths to processed files and analysis results
    """
    logger = logging.getLogger(__name__)

    if output_dir is None:
        # Use the same directory as the input file
        output_dir = os.path.dirname(input_pdb_path)

    # Ensure output directory exists
    os.makedirs(output_dir, exist_ok=True)

    base_name = os.path.splitext(os.path.basename(input_pdb_path))[0]
    cleaned_pdb_path = os.path.join(output_dir, f"{base_name}_cleaned.pdb")

    # Determine appropriate PDBQT path based on molecule type
    if is_protein:
        pdbqt_path = os.path.join(output_dir, f"{base_name}_receptor.pdbqt")
    else:
        pdbqt_path = os.path.join(output_dir, f"{base_name}_ligand.pdbqt")

    # Step 1: Clean the structure
    try:
        cleaned_path = clean_structure(input_pdb_path, cleaned_pdb_path)
        logger.info(f"Structure cleaned: {cleaned_path}")

        # Step 2: Analyze cysteines if requested
        if analyze_cys:
            cysteines = identify_cysteines(cleaned_path)
            analysis_results = analyze_cysteines(cleaned_path, cysteines)
        else:
            cysteines = identify_cysteines(cleaned_path)
            analysis_results = cysteines

        # Step 3: Convert to PDBQT format using appropriate method
        if is_protein:
            pdbqt_path = convert_to_pdbqt_receptor(
                cleaned_path, pdbqt_path, add_hydrogens=False
            )
            logger.info(f"Converted to PDBQT receptor: {pdbqt_path}")
        else:
            pdbqt_path = convert_to_pdbqt2(cleaned_path, pdbqt_path, add_hydrogens=True)
            logger.info(f"Converted to PDBQT ligand: {pdbqt_path}")

        return {
            "cleaned_pdb": cleaned_path,
            "pdbqt": pdbqt_path,
            "analysis": analysis_results,
        }

    except Exception as e:
        logger.error(f"Error in protein preparation workflow: {str(e)}")
        raise
