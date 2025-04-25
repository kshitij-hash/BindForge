import os
import tempfile

def clean_pdb_for_docking(pdb_path):
    """
    Clean a PDB file to make it suitable for docking with AutoDock Vina
    
    Args:
        pdb_path (str): Path to the PDB file to clean
        
    Returns:
        str: Path to the cleaned PDB file
    """
    if not os.path.exists(pdb_path):
        return None
        
    try:
        with open(pdb_path, 'r') as f:
            pdb_lines = f.readlines()
            
        # Filter out problematic lines
        clean_lines = []
        for line in pdb_lines:
            # Keep ATOM records
            if line.startswith('ATOM'):
                # Skip hydrogen atoms (element type H)
                if len(line) >= 78 and line[76:78].strip() == 'H':
                    continue
                clean_lines.append(line)
            # Keep HETATM records
            elif line.startswith('HETATM'):
                # Skip hydrogen atoms (element type H)
                if len(line) >= 78 and line[76:78].strip() == 'H':
                    continue
                clean_lines.append(line)
            # Keep TER records
            elif line.startswith('TER'):
                clean_lines.append(line)
            # Skip all other records (CONECT, COMPND, etc.)
                
        # Add END record if not present
        if not any(line.startswith('END') for line in clean_lines):
            clean_lines.append('END\n')
            
        # Write cleaned PDB file
        cleaned_path = pdb_path.replace('.pdb', '_docking_ready.pdb')
        with open(cleaned_path, 'w') as f:
            f.writelines(clean_lines)
            
        return cleaned_path
    except Exception as e:
        print(f"Error cleaning PDB file: {str(e)}")
        return pdb_path
