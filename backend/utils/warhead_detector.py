from rdkit import Chem
import numpy as np

class WarheadDetector:
    def __init__(self):
        """Initialize warhead detector with SMARTS patterns for common reactive groups"""
        # SMARTS patterns for common warheads
        self.warhead_patterns = {
            "acrylamide": "[CX3]=[CX3]C(=O)N",
            "vinyl_sulfonamide": "[CX3]=[CX3]S(=O)(=O)N",
            "alpha_halo_ketone": "[CX4;H1,H2][CX3](=O)[F,Cl,Br,I]",
            "alpha_halo_amide": "[CX4;H1,H2][CX3](=O)N[F,Cl,Br,I]",
            "epoxide": "C1OC1",  # Fixing the invalid SMARTS pattern
            "michael_acceptor": "[CX3]=[CX3][CX3]=O",
            "cyanoacrylate": "[CX3]=[CX3]C#N",
            "vinyl_ketone": "[CX3]=[CX3][CX3]=O",
            "allyl_sulfone": "[CX3]=[CX3]CS(=O)(=O)C"
        }
        
        # Precompile patterns for efficiency
        self.compiled_patterns = {}
        for name, smarts in self.warhead_patterns.items():
            try:
                pattern = Chem.MolFromSmarts(smarts)
                if pattern is not None:
                    self.compiled_patterns[name] = pattern
                else:
                    print(f"Warning: Failed to compile SMARTS pattern for {name}: {smarts}")
            except Exception as e:
                print(f"Error compiling pattern {name}: {smarts} - {str(e)}")
    
    def detect_warheads(self, mol_or_smiles):
        """
        Detect warhead groups in molecule
        
        Args:
            mol_or_smiles: RDKit Mol object or SMILES string
            
        Returns:
            dict: Contains has_warhead flag and list of found warheads
        """
        # Convert SMILES to molecule if needed
        if isinstance(mol_or_smiles, str):
            mol = Chem.MolFromSmiles(mol_or_smiles)
            if mol is None:
                return {
                    "has_warhead": False,
                    "warheads": [],
                    "error": "Invalid SMILES string"
                }
        else:
            mol = mol_or_smiles
            
        if mol is None:
            return {
                "has_warhead": False,
                "warheads": [],
                "error": "Invalid molecule"
            }
            
        # Find matches for each pattern
        warheads = []
        
        for name, pattern in self.compiled_patterns.items():
            if pattern is None:
                continue  # Skip invalid patterns
                
            try:
                matches = mol.GetSubstructMatches(pattern)
                if matches:
                    warhead_info = {
                        "type": name,
                        "count": len(matches),
                        "atom_indices": [list(match) for match in matches]
                    }
                    warheads.append(warhead_info)
            except Exception as e:
                print(f"Error matching pattern {name}: {str(e)}")
                
        return {
            "has_warhead": len(warheads) > 0,
            "warheads": warheads
        }

def calculate_covalent_score(affinity, distance_to_cysteine):
    """
    Calculate a score for potential covalent binding
    
    Args:
        affinity: Docking binding affinity (kcal/mol)
        distance_to_cysteine: Distance to cysteine sulfur (Angstrom)
        
    Returns:
        float: Score representing covalent binding potential
    """
    # Ideal distance is around 3-4 Å
    distance_factor = 1.0 / (1.0 + np.exp((distance_to_cysteine - 4.0) * 2.0))
    
    # Affinity is typically negative, better scores are more negative
    # Normalize to positive value for scoring
    affinity_factor = np.exp(-affinity / 2.0)
    
    # Combine scores
    return distance_factor * affinity_factor * 10.0

def predict_covalent_binding(affinity, has_warhead, distance_to_cysteine):
    """
    Predict if a compound is likely to form a covalent bond
    
    Args:
        affinity: Docking binding affinity (kcal/mol)
        has_warhead: Whether compound contains a warhead group
        distance_to_cysteine: Distance to cysteine sulfur (Angstrom)
        
    Returns:
        dict: Prediction results
    """
    # No warhead, no covalent binding
    if not has_warhead:
        return {
            "is_covalent": False,
            "confidence": 0.9,
            "reason": "No reactive warhead detected"
        }
    
    # Distance too large for covalent bond
    if distance_to_cysteine > 7.0:
        return {
            "is_covalent": False,
            "confidence": 0.8,
            "reason": f"Distance to cysteine ({distance_to_cysteine:.1f} Å) too large for covalent bond"
        }
    
    # Ideal distance for covalent binding
    if 3.0 <= distance_to_cysteine <= 5.0:
        confidence = 0.9
        if affinity < -7.0:  # Good affinity
            confidence = 0.95
            
        return {
            "is_covalent": True,
            "confidence": confidence,
            "reason": f"Warhead at optimal distance ({distance_to_cysteine:.1f} Å) with good affinity ({affinity:.1f})"
        }
    
    # Close enough but not ideal
    if distance_to_cysteine < 7.0:
        confidence = 0.7
        if affinity < -7.0:  # Good affinity
            confidence = 0.8
            
        return {
            "is_covalent": True,
            "confidence": confidence,
            "reason": f"Warhead at reasonable distance ({distance_to_cysteine:.1f} Å) with affinity {affinity:.1f}"
        }
    
    # Fallback
    return {
        "is_covalent": False,
        "confidence": 0.6,
        "reason": "Conditions not ideal for covalent binding"
    }