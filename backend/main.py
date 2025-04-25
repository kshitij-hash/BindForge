import os
import shutil
from typing import Dict, List, Optional
from datetime import datetime

from fastapi import FastAPI, File, Form, HTTPException, UploadFile, Request
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware  # Import CORS middleware
from pydantic import BaseModel
from utils.report_generator import generate_docking_report
from utils.compound_extractor import (
    download_mk2_inhibitors_sdf,
    extract_mk2_inhibitors_to_library,
    search_mk2_inhibitors,
)
from utils.molecule_handler import batch_process_smiles, process_sdf, process_smiles
from utils.molecule_library import (
    get_all_covalent_inhibitors,
    get_all_non_covalent_binders,
    get_all_warhead_fragments,
    get_molecule_by_name,
    get_test_set,
)
from utils.structure_cleaner import clean_analyze_and_convert, clean_and_identify
from utils.warhead_detector import WarheadDetector

# Add these imports
from controllers.docking_controller import DockingController
import tempfile
import os

# Create FastAPI app
app = FastAPI(
    title="AI-Enhanced Docking Predictions",
    description="API for protein structure cleaning and docking predictions",
    version="1.0.0",
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Frontend origin
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# Configuration
UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), "uploads")
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(os.path.join(UPLOAD_FOLDER, "structures"), exist_ok=True)
os.makedirs(os.path.join(UPLOAD_FOLDER, "cleaned"), exist_ok=True)
os.makedirs(os.path.join(UPLOAD_FOLDER, "molecules"), exist_ok=True)

# Mount static files directory for serving uploaded files
app.mount("/uploads", StaticFiles(directory=UPLOAD_FOLDER), name="uploads")


# Define response models
class CysteineInfo(BaseModel):
    chain: str
    residue_number: int
    residue_name: str


class CleanStructureResponse(BaseModel):
    success: bool
    cleaned_structure_url: str
    cysteines: List[CysteineInfo]


class ErrorResponse(BaseModel):
    error: str


class CompleteStructureResponse(BaseModel):
    success: bool
    cleaned_structure_url: str
    # pdbqt_structure_url: str
    cysteines: List[CysteineInfo]
    chain_groups: Dict[str, List[int]]
    potential_disulfide_bonds: List = []


class MoleculeInputSMILES(BaseModel):
    smiles: str
    name: Optional[str] = None


class MoleculeInputBatch(BaseModel):
    smiles_list: List[str]
    names: Optional[List[str]] = None


class MoleculeResult(BaseModel):
    name: str
    smiles: str
    pdb_url: Optional[str] = None
    pdbqt_url: Optional[str] = None
    error: Optional[str] = None


class MoleculeResponse(BaseModel):
    success: bool
    molecules: List[MoleculeResult]


class LibraryResponse(BaseModel):
    success: bool
    molecules: Dict[str, Dict]


class SearchCompoundsResponse(BaseModel):
    success: bool
    molecules: List[Dict]


class PreparedProteinResponse(BaseModel):
    success: bool
    cleaned_structure_url: str
    filesystem_path: str  # Add this to track the actual filesystem path
    cysteines: List[CysteineInfo]
    chain_groups: Dict[str, List[int]]
    potential_disulfide_bonds: List = []


@app.post(
    "/api/clean-structure",
    response_model=CleanStructureResponse,
    responses={400: {"model": ErrorResponse}, 500: {"model": ErrorResponse}},
)
async def clean_structure_route(file: UploadFile = File(...)):
    """
    Clean a protein structure by removing water molecules and ligands,
    and adding hydrogens. Also identifies cysteine residues.

    - **file**: PDB file to clean

    Returns:
        - **success**: Whether the operation was successful
        - **cleaned_structure_url**: URL to download the cleaned structure
        - **cysteines**: List of identified cysteine residues
    """
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file selected")

    # Save the uploaded file
    upload_dir = os.path.join(UPLOAD_FOLDER, "structures")
    temp_input_path = os.path.join(upload_dir, file.filename)

    with open(temp_input_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    output_dir = os.path.join(UPLOAD_FOLDER, "cleaned")
    base_name = os.path.splitext(os.path.basename(temp_input_path))[0]
    output_path = os.path.join(output_dir, f"{base_name}_cleaned.pdb")

    try:
        # Clean the structure and identify cysteines
        cleaned_path, analysis_results = clean_and_identify(
            temp_input_path, output_path
        )

        # Generate relative path for API response
        relative_path = os.path.relpath(cleaned_path, start=UPLOAD_FOLDER)
        download_url = f"/uploads/{relative_path}"

        # Extract cysteines from the analysis result
        if isinstance(analysis_results, dict) and "cysteines" in analysis_results:
            cysteines = analysis_results["cysteines"]
        else:
            cysteines = analysis_results

        return {
            "success": True,
            "cleaned_structure_url": download_url,
            "cysteines": cysteines,
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post(
    "/api/prepare-protein",
    response_model=PreparedProteinResponse,  # Update the response model
    responses={400: {"model": ErrorResponse}, 500: {"model": ErrorResponse}},
)
async def prepare_protein_route(file: UploadFile = File(...)):
    """
    Complete protein preparation for docking:
    1. Clean structure (remove water, add hydrogens)
    2. Identify cysteine residues
    3. Convert to PDBQT format for AutoDock Vina

    - **file**: PDB file to process

    Returns:
        - **success**: Whether the operation was successful
        - **cleaned_structure_url**: URL to download the cleaned PDB structure
        - **filesystem_path**: Actual filesystem path for internal API use
        - **cysteines**: List of identified cysteine residues
    """
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file selected")

    # Create a predictable filename to store the processed protein
    base_filename = os.path.splitext(file.filename)[0]
    timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
    unique_id = f"{base_filename}_{timestamp}"

    # Save the uploaded file in predictable location
    upload_dir = os.path.join(UPLOAD_FOLDER, "structures")
    temp_input_path = os.path.join(upload_dir, f"{unique_id}_original.pdb")

    with open(temp_input_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # Store processed proteins in a dedicated 'prepared_proteins' directory for easier lookup
    output_dir = os.path.join(UPLOAD_FOLDER, "prepared_proteins")
    os.makedirs(output_dir, exist_ok=True)

    try:
        # Complete protein preparation workflow
        result = clean_analyze_and_convert(temp_input_path, output_dir)

        # Generate relative paths for API response
        cleaned_relative_path = os.path.relpath(
            result["cleaned_pdb"], start=UPLOAD_FOLDER
        )
        cleaned_download_url = f"/uploads/{cleaned_relative_path}"

        # Extract analysis data
        analysis = (
            result["analysis"]
            if isinstance(result["analysis"], dict)
            else {"cysteines": result["analysis"]}
        )

        cysteines = analysis.get("cysteines", [])
        chain_groups = analysis.get("chain_groups", {})
        potential_disulfide_bonds = analysis.get("potential_disulfide_bonds", [])

        return {
            "success": True,
            "cleaned_structure_url": cleaned_download_url,
            "filesystem_path": result["cleaned_pdb"],  # Add the actual filesystem path
            "cysteines": cysteines,
            "chain_groups": chain_groups,
            "potential_disulfide_bonds": potential_disulfide_bonds,
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post(
    "/api/process-smiles",
    response_model=MoleculeResponse,
    responses={400: {"model": ErrorResponse}, 500: {"model": ErrorResponse}},
)
async def process_smiles_route(molecule: MoleculeInputSMILES):
    """
    Process a SMILES string to create 3D structures and prepare for docking

    - **smiles**: SMILES representation of the molecule
    - **name**: Optional name for the molecule

    Returns:
        - **success**: Whether the operation was successful
        - **molecules**: List containing the processed molecule
    """
    try:
        output_dir = os.path.join(UPLOAD_FOLDER, "molecules")
        result = process_smiles(molecule.smiles, output_dir, molecule.name)

        # Generate URLs for API response
        pdb_rel_path = os.path.relpath(result["pdb_path"], start=UPLOAD_FOLDER)
        pdbqt_rel_path = os.path.relpath(result["pdbqt_path"], start=UPLOAD_FOLDER)

        return {
            "success": True,
            "molecules": [
                {
                    "name": result["name"],
                    "smiles": result["smiles"],
                    "pdb_url": f"/uploads/{pdb_rel_path}",
                    "pdbqt_url": f"/uploads/{pdbqt_rel_path}",
                }
            ],
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post(
    "/api/batch-process-smiles",
    response_model=MoleculeResponse,
    responses={400: {"model": ErrorResponse}, 500: {"model": ErrorResponse}},
)
async def batch_process_smiles_route(batch: MoleculeInputBatch):
    """
    Process multiple SMILES strings to create 3D structures and prepare for docking

    - **smiles_list**: List of SMILES strings
    - **names**: Optional list of names for the molecules

    Returns:
        - **success**: Whether the operation was successful
        - **molecules**: List of processed molecules
    """
    try:
        output_dir = os.path.join(UPLOAD_FOLDER, "molecules")
        results = batch_process_smiles(batch.smiles_list, output_dir, batch.names)

        molecules = []
        for result in results:
            if "error" in result:
                molecules.append(
                    {
                        "name": result["name"],
                        "smiles": result["smiles"],
                        "error": result["error"],
                    }
                )
            else:
                # Generate URLs for API response
                pdb_rel_path = os.path.relpath(result["pdb_path"], start=UPLOAD_FOLDER)
                pdbqt_rel_path = os.path.relpath(
                    result["pdbqt_path"], start=UPLOAD_FOLDER
                )

                molecules.append(
                    {
                        "name": result["name"],
                        "smiles": result["smiles"],
                        "pdb_url": f"/uploads/{pdb_rel_path}",
                        "pdbqt_url": f"/uploads/{pdbqt_rel_path}",
                    }
                )

        return {"success": True, "molecules": molecules}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post(
    "/api/process-sdf",
    response_model=MoleculeResponse,
    responses={400: {"model": ErrorResponse}, 500: {"model": ErrorResponse}},
)
async def process_sdf_route(file: UploadFile = File(...)):
    """
    Process an SDF file to create 3D structures and prepare for docking

    - **file**: SDF file containing one or more molecules

    Returns:
        - **success**: Whether the operation was successful
        - **molecules**: List of processed molecules
    """
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file selected")

    if not file.filename.lower().endswith(".sdf"):
        raise HTTPException(status_code=400, detail="File must be an SDF file")

    try:
        # Save the uploaded file
        upload_dir = os.path.join(UPLOAD_FOLDER, "structures")
        temp_input_path = os.path.join(upload_dir, file.filename)

        with open(temp_input_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        output_dir = os.path.join(UPLOAD_FOLDER, "molecules")
        results = process_sdf(temp_input_path, output_dir)

        molecules = []
        for result in results:
            # Generate URLs for API response
            pdb_rel_path = os.path.relpath(result["pdb_path"], start=UPLOAD_FOLDER)
            pdbqt_rel_path = os.path.relpath(result["pdbqt_path"], start=UPLOAD_FOLDER)

            molecules.append(
                {
                    "name": result["name"],
                    "smiles": result["smiles"],
                    "pdb_url": f"/uploads/{pdb_rel_path}",
                    "pdbqt_url": f"/uploads/{pdbqt_rel_path}",
                }
            )

        return {"success": True, "molecules": molecules}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get(
    "/api/library/covalent",
    response_model=LibraryResponse,
    responses={500: {"model": ErrorResponse}},
)
async def get_covalent_library():
    """
    Get a library of known covalent MK2 inhibitors
    """
    try:
        return {"success": True, "molecules": get_all_covalent_inhibitors()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get(
    "/api/library/non-covalent",
    response_model=LibraryResponse,
    responses={500: {"model": ErrorResponse}},
)
async def get_non_covalent_library():
    """
    Get a library of known non-covalent MK2 binders
    """
    try:
        return {"success": True, "molecules": get_all_non_covalent_binders()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get(
    "/api/library/warheads",
    response_model=LibraryResponse,
    responses={500: {"model": ErrorResponse}},
)
async def get_warheads_library():
    """
    Get a library of common warhead fragments for covalent inhibitors
    """
    try:
        return {"success": True, "molecules": get_all_warhead_fragments()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get(
    "/api/library/test-set",
    response_model=LibraryResponse,
    responses={500: {"model": ErrorResponse}},
)
async def get_test_molecules():
    """
    Get a test set of molecules including both covalent and non-covalent binders
    """
    try:
        return {"success": True, "molecules": get_test_set()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get(
    "/api/library/process-test-set",
    response_model=MoleculeResponse,
    responses={500: {"model": ErrorResponse}},
)
async def process_test_set():
    """
    Process the test set of molecules to create 3D structures and prepare for docking
    """
    try:
        test_molecules = get_test_set()
        smiles_list = [mol["smiles"] for mol in test_molecules.values()]
        names = list(test_molecules.keys())

        output_dir = os.path.join(UPLOAD_FOLDER, "molecules")
        results = batch_process_smiles(smiles_list, output_dir, names)

        molecules = []
        for result in results:
            if "error" in result:
                molecules.append(
                    {
                        "name": result["name"],
                        "smiles": result["smiles"],
                        "error": result["error"],
                    }
                )
            else:
                # Generate URLs for API response
                pdb_rel_path = os.path.relpath(result["pdb_path"], start=UPLOAD_FOLDER)
                pdbqt_rel_path = os.path.relpath(
                    result["pdbqt_path"], start=UPLOAD_FOLDER
                )

                molecules.append(
                    {
                        "name": result["name"],
                        "smiles": result["smiles"],
                        "pdb_url": f"/uploads/{pdb_rel_path}",
                        "pdbqt_url": f"/uploads/{pdbqt_rel_path}",
                    }
                )

        return {"success": True, "molecules": molecules}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get(
    "/api/search/pubchem",
    response_model=SearchCompoundsResponse,
    responses={500: {"model": ErrorResponse}},
)
async def search_pubchem_compounds_route():
    """
    Search PubChem for MK2 inhibitors
    """
    try:
        compounds = search_mk2_inhibitors(max_compounds=10)

        molecules = []
        for compound in compounds:
            if "CanonicalSMILES" in compound:
                molecules.append(
                    {
                        "name": compound.get(
                            "IUPACName", f"CID_{compound.get('CID', 'unknown')}"
                        ),
                        "smiles": compound["CanonicalSMILES"],
                        "molecular_weight": compound.get("MolecularWeight", ""),
                        "molecular_formula": compound.get("MolecularFormula", ""),
                        "pubchem_cid": compound.get("CID", ""),
                    }
                )

        return {"success": True, "molecules": molecules}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Add these endpoints
docking_controller = DockingController()

@app.post("/api/dock")
async def dock_molecule(request: Request):
    data = await request.json()
    
    # Get SMILES string from request
    smiles = data.get("smiles")
    if not smiles:
        raise HTTPException(status_code=400, detail="SMILES string required")
    
    # Create a new docking controller for each request
    docking_controller = DockingController()
    
    # Process the protein path - try multiple approaches to find the protein
    protein_path = data.get("protein_path")
    filesystem_path = data.get("filesystem_path")  # Check if frontend passes this directly
    
    print(f"Received protein_path: {protein_path}")
    print(f"Received filesystem_path: {filesystem_path}")
    
    # Try the filesystem path first if provided
    if filesystem_path and os.path.exists(filesystem_path):
        docking_controller.set_protein(filesystem_path)
        print(f"Using direct filesystem path: {filesystem_path}")
    elif protein_path:
        # Handle different path formats
        if protein_path.startswith("/uploads/"):
            # Convert URL path to filesystem path
            local_path = os.path.join(UPLOAD_FOLDER, protein_path.replace("/uploads/", "", 1))
            print(f"Looking for protein at: {local_path}")  # Debug print
            
            if os.path.exists(local_path):
                docking_controller.set_protein(local_path)
                print(f"Protein structure set to: {local_path}")
            else:
                # Try to check if it's a PDB file that needs to be converted to PDBQT
                pdb_path = local_path
                if local_path.endswith('.pdbqt'):
                    pdb_path = local_path.replace('.pdbqt', '.pdb')
                
                if os.path.exists(pdb_path):
                    print(f"Found PDB at: {pdb_path}")
                    docking_controller.set_protein(pdb_path)
                else:
                    raise HTTPException(status_code=404, detail=f"Protein file not found at {local_path}")
        elif protein_path.startswith("http"):
            # Extract just the path part if it's a full URL
            from urllib.parse import urlparse
            parsed_url = urlparse(protein_path)
            path_part = parsed_url.path
            
            if path_part.startswith("/uploads/"):
                local_path = os.path.join(UPLOAD_FOLDER, path_part.replace("/uploads/", "", 1))
                if os.path.exists(local_path):
                    docking_controller.set_protein(local_path)
                    print(f"Protein structure set to: {local_path}")
                else:
                    raise HTTPException(status_code=404, detail=f"Protein file not found at {local_path}")
        else:
            # Check if it's a direct path
            if os.path.exists(protein_path):
                docking_controller.set_protein(protein_path)
            else:
                # Try as a relative path within UPLOAD_FOLDER
                local_path = os.path.join(UPLOAD_FOLDER, protein_path.lstrip("/"))
                if os.path.exists(local_path):
                    docking_controller.set_protein(local_path)
                else:
                    raise HTTPException(
                        status_code=404, 
                        detail=f"Protein file not found: {protein_path}"
                    )
    
    # If still no protein path, try to find it in the prepared_proteins directory
    if not docking_controller.protein_path and protein_path:
        # Strip URL parts and extract just the filename
        protein_filename = os.path.basename(protein_path)
        prepared_protein_dir = os.path.join(UPLOAD_FOLDER, "prepared_proteins")
        
        # Try to find a matching file in the prepared_proteins directory
        for root, _, files in os.walk(prepared_protein_dir):
            for file in files:
                if protein_filename in file:
                    potential_path = os.path.join(root, file)
                    if os.path.exists(potential_path):
                        docking_controller.set_protein(potential_path)
                        print(f"Found protein by filename match: {potential_path}")
                        break
    
    if not docking_controller.protein_path:
        # Try to use a default protein if available
        default_paths = [
            os.path.join(os.path.dirname(__file__), "data/proteins/default_protein.pdbqt"),
            os.path.join(UPLOAD_FOLDER, "structures/default_protein.pdbqt"),
            os.path.join(UPLOAD_FOLDER, "cleaned/default_protein.pdb")
        ]
        
        for path in default_paths:
            if os.path.exists(path):
                docking_controller.set_protein(path)
                print(f"Using default protein at: {path}")
                break
                
    if not docking_controller.protein_path:
        raise HTTPException(status_code=400, detail="Protein structure not set. Please provide a valid protein structure path.")
    
    # Get cysteine residue ID if doing covalent docking
    cysteine_id = data.get("cysteine_id")
    
    # Perform docking
    try:
        results = docking_controller.dock_from_smiles(
            smiles=smiles, 
            cysteine_id=cysteine_id
        )
        return results
    except Exception as e:
        import traceback
        print(f"Docking error: {str(e)}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/detect-warheads")
async def detect_warheads(request: Request):
    data = await request.json()
    smiles = data.get("smiles")
    
    if not smiles:
        raise HTTPException(status_code=400, detail="SMILES string required")
    
    detector = WarheadDetector()
    result = detector.detect_warheads(smiles)
    
    return result

@app.post("/api/generate-report")
async def generate_report_route(request: Request):
    """
    Generate a detailed PDF report for docking results
    """
    data = await request.json()
    
    docking_results = data.get("docking_results", {})
    protein_info = data.get("protein_info", {})
    molecule_info = data.get("molecule_info", {})
    
    try:
        reports_dir = os.path.join(UPLOAD_FOLDER, "reports")
        os.makedirs(reports_dir, exist_ok=True)
        
        report_path = generate_docking_report(
            docking_results, 
            protein_info, 
            molecule_info, 
            reports_dir
        )
        
        # Generate URL for downloading the report
        report_rel_path = os.path.relpath(report_path, start=UPLOAD_FOLDER)
        report_url = f"/uploads/{report_rel_path}"
        
        return {
            "success": True,
            "report_url": report_url,
            "filename": os.path.basename(report_path)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/")
async def home():
    """
    Root endpoint providing API information
    """
    return {
        "status": "API is running",
        "endpoints": {
            "clean_structure": "/api/clean-structure",
            "prepare_protein": "/api/prepare-protein",
            "process_smiles": "/api/process-smiles",
            "batch_process_smiles": "/api/batch-process-smiles",
            "process_sdf": "/api/process-sdf",
            "library_covalent": "/api/library/covalent",
            "library_non_covalent": "/api/library/non-covalent",
            "library_warheads": "/api/library/warheads",
            "library_test_set": "/api/library/test-set",
            "process_test_set": "/api/library/process-test-set",
            "search_pubchem": "/api/search/pubchem",
        },
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)
