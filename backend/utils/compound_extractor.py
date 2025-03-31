import os
import time
from typing import Dict, List, Optional

import requests


def search_pubchem_compounds(query: str, max_compounds: int = 10) -> List[int]:
    """
    Search PubChem for compounds based on a query string
    Returns list of PubChem CIDs (Compound IDs)
    """
    base_url = "https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name"
    search_url = f"{base_url}/{query}/cids/JSON"

    try:
        response = requests.get(search_url)
        if response.status_code == 200:
            data = response.json()
            if "IdentifierList" in data and "CID" in data["IdentifierList"]:
                cids = data["IdentifierList"]["CID"]
                return cids[:max_compounds]  # Limit number of compounds
        return []
    except Exception as e:
        print(f"Error searching PubChem: {e}")
        return []


def get_compound_smiles(cid: int) -> Optional[str]:
    """
    Get SMILES string for a compound by PubChem CID
    """
    base_url = "https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid"
    property_url = f"{base_url}/{cid}/property/CanonicalSMILES/TXT"

    try:
        response = requests.get(property_url)
        if response.status_code == 200:
            return response.text.strip()
        return None
    except Exception as e:
        print(f"Error getting SMILES: {e}")
        return None


def get_compound_properties(cid: int) -> Dict:
    """
    Get basic properties for a compound by PubChem CID
    """
    base_url = "https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid"
    props = "MolecularFormula,MolecularWeight,IUPACName,CanonicalSMILES"
    property_url = f"{base_url}/{cid}/property/{props}/JSON"

    try:
        response = requests.get(property_url)
        if response.status_code == 200:
            data = response.json()
            if "PropertyTable" in data and "Properties" in data["PropertyTable"]:
                return data["PropertyTable"]["Properties"][0]
        return {}
    except Exception as e:
        print(f"Error getting properties: {e}")
        return {}


def download_compound_sdf(cid: int, output_path: str) -> bool:
    """
    Download SDF file for a compound by PubChem CID
    """
    base_url = "https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid"
    sdf_url = f"{base_url}/{cid}/SDF"

    try:
        response = requests.get(sdf_url)
        if response.status_code == 200:
            with open(output_path, "w") as f:
                f.write(response.text)
            return True
        return False
    except Exception as e:
        print(f"Error downloading SDF: {e}")
        return False


def search_mk2_inhibitors(max_compounds: int = 10) -> List[Dict]:
    """
    Search for MK2 inhibitors and return their properties
    """
    # Search terms related to MK2 inhibitors
    search_terms = [
        "MK2 inhibitor",
        "MAPKAPK2 inhibitor",
        "PF-3644022",  # Known MK2 inhibitor
        "MK2 covalent inhibitor",
    ]

    all_compounds = []

    for term in search_terms:
        print(f"Searching for: {term}")
        cids = search_pubchem_compounds(term, max_compounds)

        for cid in cids:
            # Avoid API rate limiting
            time.sleep(0.2)

            props = get_compound_properties(cid)
            if props and "CanonicalSMILES" in props:
                # Add source term to track where it came from
                props["SearchTerm"] = term
                props["CID"] = cid
                all_compounds.append(props)

                print(
                    f"Found compound: CID {cid}, SMILES: {props.get('CanonicalSMILES')}"
                )

    # Remove duplicates by CID
    unique_compounds = {comp["CID"]: comp for comp in all_compounds}.values()
    return list(unique_compounds)


def download_mk2_inhibitors_sdf(output_dir: str, max_compounds: int = 10) -> str:
    """
    Download MK2 inhibitors as individual SDF files and create a combined file
    """
    os.makedirs(output_dir, exist_ok=True)

    # Get MK2 inhibitors
    compounds = search_mk2_inhibitors(max_compounds)

    # Combined SDF file path
    combined_path = os.path.join(output_dir, "mk2_inhibitors.sdf")
    combined_file = open(combined_path, "w")

    for compound in compounds:
        cid = compound["CID"]

        # Individual SDF file
        individual_path = os.path.join(output_dir, f"cid_{cid}.sdf")

        # Download SDF
        success = download_compound_sdf(cid, individual_path)

        if success:
            # Append to combined file
            with open(individual_path, "r") as f:
                combined_file.write(f.read())
            print(f"Added CID {cid} to combined SDF")

    combined_file.close()
    print(f"Created combined SDF file: {combined_path}")
    return combined_path


def extract_mk2_inhibitors_to_library(output_file: str = None) -> Dict:
    """
    Extract MK2 inhibitors and format them for our molecule library
    Returns a dictionary formatted for molecule_library.py
    """
    if output_file is None:
        output_file = "/home/kshitij/dev/ai-agent-enhanced-docking-predictions/backend/data/mk2_inhibitors.py"

    compounds = search_mk2_inhibitors(20)  # Get up to 20 compounds

    # Format for our library
    library_dict = {}

    for compound in compounds:
        if "IUPACName" in compound and "CanonicalSMILES" in compound:
            # Generate a clean name
            name = compound.get("IUPACName", "").replace(" ", "_")[:30]
            if not name:
                name = f"CID_{compound['CID']}"

            # Add to library
            library_dict[name] = {
                "smiles": compound["CanonicalSMILES"],
                "description": f"MK2 inhibitor (PubChem CID: {compound['CID']}), "
                + f"found by searching '{compound.get('SearchTerm', 'MK2 inhibitor')}'",
            }

    # Generate Python code
    if output_file:
        os.makedirs(os.path.dirname(output_file), exist_ok=True)
        with open(output_file, "w") as f:
            f.write("# Auto-generated MK2 inhibitors from PubChem\n\n")
            f.write("PUBCHEM_MK2_INHIBITORS = {\n")

            for name, data in library_dict.items():
                f.write(f'    "{name}": {{\n')
                f.write(f'        "smiles": "{data["smiles"]}",\n')
                f.write(f'        "description": "{data["description"]}"\n')
                f.write("    },\n")
            f.write("}\n")

        print(f"Saved library to {output_file}")

    return library_dict


if __name__ == "__main__":
    # Example usage
    output_dir = "/home/kshitij/dev/ai-agent-enhanced-docking-predictions/backend/data"
    os.makedirs(output_dir, exist_ok=True)

    # Extract and save as Python library
    extract_mk2_inhibitors_to_library()

    # Download as SDF files
    download_mk2_inhibitors_sdf(output_dir, max_compounds=10)
