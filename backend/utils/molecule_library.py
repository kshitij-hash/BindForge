"""
Library of known MK2 inhibitors and test molecules
"""

# Known covalent MK2 inhibitors from literature
COVALENT_MK2_INHIBITORS = {
    "PF-3644022": {
        "smiles": "COC1=C(OC)C=C(CC(O)=O)C2=C1C(=NC=C2)C1=CC=C(CN2CCN(C)CC2)C=C1",
        "description": "Covalent MK2 inhibitor with Michael acceptor warhead"
    },
    "MMI-0100": {
        "smiles": r"CC(C)(C)NC(=O)[C@H]1C[C@@H](CN1C(=O)[C@@H](NC(=O)c1nc2ccccc2o1)C(C)(C)C)C(=O)N\N=C\c1ccncc1",
        "description": "Peptide-based covalent inhibitor targeting MK2"
    },
    "Acrylamide-1": {
        "smiles": r"O=C(N/N=C/c1cccnc1)C1CC(CN1C(=O)C(NC(=O)c1nc2ccccc2s1)C(C)(C)C)C(=O)NC(C)(C)C",
        "description": "Acrylamide-based covalent inhibitor"
    },
    "Chloroacetamide-1": {
        "smiles": "CC(C)(C)NC(=O)C1=CC=CC=C1NC(=O)CCl",
        "description": "Chloroacetamide warhead compound"
    },
}

# Non-covalent MK2 binders for comparison
NON_COVALENT_MK2_BINDERS = {
    "MK2-IN-1": {
        "smiles": "CCOC(=O)c1c(C)[nH]c(C)c1-c1ccc(NC(=O)Cc2cccc3ccccc23)cc1",
        "description": "ATP-competitive MK2 inhibitor"
    },
    "PF-3644022-analog": {
        "smiles": "COC1=C(OC)C=C(CC(O)=O)C2=C1C(=NC=C2)C1=CC=C(CN2CCN(C)CC2)C=C1",
        "description": "Non-covalent analog of PF-3644022"
    },
}

# Common warhead molecules for covalent inhibitors
WARHEAD_FRAGMENTS = {
    "acrylamide": {
        "smiles": "C=CC(=O)N",
        "description": "Acrylamide warhead - Michael acceptor"
    },
    "chloroacetamide": {
        "smiles": "ClCC(=O)N",
        "description": "Chloroacetamide warhead"
    },
    "vinylsulfonamide": {
        "smiles": "C=CS(=O)(=O)N",
        "description": "Vinylsulfonamide warhead"
    },
    "propiolamide": {
        "smiles": "C#CC(=O)N",
        "description": "Propiolamide warhead"
    },
}

def get_all_covalent_inhibitors():
    """Return all covalent inhibitors in the library"""
    return COVALENT_MK2_INHIBITORS

def get_all_non_covalent_binders():
    """Return all non-covalent binders in the library"""
    return NON_COVALENT_MK2_BINDERS

def get_all_warhead_fragments():
    """Return all warhead fragments in the library"""
    return WARHEAD_FRAGMENTS

def get_test_set():
    """Return a combined test set of molecules"""
    # Combine a selection of molecules for testing
    test_set = {}
    test_set.update(COVALENT_MK2_INHIBITORS)
    test_set.update(NON_COVALENT_MK2_BINDERS)
    return test_set

def get_molecule_by_name(name):
    """Get a specific molecule by name"""
    # Search in all collections
    all_molecules = {}
    all_molecules.update(COVALENT_MK2_INHIBITORS)
    all_molecules.update(NON_COVALENT_MK2_BINDERS)
    all_molecules.update(WARHEAD_FRAGMENTS)
    
    return all_molecules.get(name)
