from Bio.PDB import PDBParser, Selection
import os

def get_residue_coordinates(pdb_path, chain_id, residue_number, atom_name="CA"):
    """
    Get the coordinates of a specific atom from a residue in a PDB file
    
    Args:
        pdb_path: Path to the PDB file
        chain_id: Chain identifier (e.g., 'A')
        residue_number: Residue sequence number
        atom_name: Name of the atom (default: CA for alpha carbon)
        
    Returns:
        list: [x, y, z] coordinates of the atom, or None if not found
    """
    # For PDBQT files, try to find a corresponding PDB or attempt to read anyway
    if pdb_path.endswith('.pdbqt'):
        potential_pdb = pdb_path.replace('.pdbqt', '.pdb')
        if os.path.exists(potential_pdb):
            pdb_path = potential_pdb
            
    try:
        parser = PDBParser(QUIET=True)
        structure = parser.get_structure('protein', pdb_path)
        
        # Find the residue
        for model in structure:
            if chain_id in model:
                chain = model[chain_id]
                
                # Try to get the residue with the residue ID
                residue_found = False
                for residue in chain:
                    if residue.get_id()[1] == residue_number:
                        residue_found = True
                        # Find the requested atom
                        if atom_name in residue:
                            atom = residue[atom_name]
                            return atom.get_coord().tolist()
                        else:
                            # If specific atom not found, return CA or first atom
                            if "CA" in residue:
                                return residue["CA"].get_coord().tolist()
                            else:
                                # Get first atom
                                for atom in residue:
                                    return atom.get_coord().tolist()
                
                if not residue_found:
                    print(f"Warning: Residue {residue_number} not found in chain {chain_id}")
                    return None
        
        print(f"Warning: Chain {chain_id} not found in structure")
        return None
        
    except Exception as e:
        print(f"Error parsing PDB structure: {str(e)}")
        return None