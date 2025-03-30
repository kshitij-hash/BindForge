# AI-Enhanced Molecular Docking Predictions

This project aims to enhance molecular docking predictions using AI/ML techniques.

## Environment Setup

### Installation

1. Clone this repository:
```bash
git clone <repository-url>
cd ai-agent-enhanced-docking-predictions
```

3. Activate the virtual environment:
```bash
source .venv/bin/activate
```

## Project Structure

The project is organized as follows:
- `data/`: Contains datasets used for training and testing
- `models/`: Contains ML model definitions
- `scripts/`: Contains utility scripts
- `notebooks/`: Contains Jupyter notebooks for exploration

## License

[Add license information here]

# Steps for Building the First MVP of MK2 Covalent Inhibitor Prediction Tool

## Step 1: Basic Environment Setup

### Install Python 3.9+ with essential packages:

* **RDKit** for molecular handling
* **NumPy** and **Pandas** for data processing
* **PyTorch** (lightweight installation) for simple ML model

### Install AutoDock Vina and configure it in your environment


## Step 2: Protein Preparation

1. Download a single high-quality MK2 structure (e.g., PDB: 3M2W)
2. Clean the structure:
   * Remove water molecules and ligands
   * Add hydrogens using OpenBabel
   * Identify the target cysteine residue(s)
3. Save as PDBQT format for AutoDock Vina

## Step 3: Implement Basic Docking Pipeline

### Create a molecule input handler:
* Accept SMILES or SDF input
* Convert to 3D structures
* Generate PDBQT files for docking

### Set up docking configuration:
* Define grid box around target cysteine
* Configure basic Vina parameters (exhaustiveness=8)
* Create a simple docking script

### Build results parser:
* Extract binding poses and scores
* Calculate distance between warheads and cysteine

## Step 4: Simple Covalent Prediction

### Implement basic warhead detection:
* Identify common electrophilic groups (acrylamides, chloroacetamides)
* Tag reactive atoms in molecules

### Create distance-based scoring:
* Calculate distance between warhead and cysteine sulfur
* Apply simple scoring function: `score = docking_score × (1/distance_factor)`

### Implement basic classifier:
* If distance < 4Å and warhead present: "Likely covalent binder"
* Else: "Unlikely covalent binder"

## Step 5: Minimal Test Dataset

### Collect 10-20 known molecules:
* 5-10 known MK2 covalent inhibitors from literature
* 5-10 non-covalent binders or non-binders
* Prepare structures in SMILES format

### Create validation script:
* Run all test molecules through pipeline
* Compare predictions with known activity
* Calculate basic accuracy metrics

## Step 6: Simple User Interface

### Build minimal Flask web app:
* Create input form for SMILES or structure drawing
* Add submit button to trigger docking process
* Design basic results page

### Implement results visualization:
* Use 3Dmol.js for interactive 3D visualization
* Highlight cysteine residue and potential warhead
* Display distance measurements and scores

## Step 7: Basic Feedback Module

### Implement simple rule-based suggestions:
* If warhead too far: "Consider extending linker"
* If poor docking score: "Consider adding H-bond donors/acceptors"
* If good position but wrong warhead: "Consider alternative warhead"

### Add structure modification examples:
* Provide 2-3 template modifications based on rules
* Show modified structures as SMILES

## Step 8: Integration and Testing

### Connect all components in a workflow:
* Input → Docking → Covalent Assessment → Results Display

### Test with validation set:
* Process all test molecules
* Verify results are consistent
* Document accuracy on known compounds

## Step 9: MVP Demo Preparation

### Prepare demo script:
* Select 3-5 diverse examples to showcase
* Document expected outcomes
* Prepare explanations for each step

### Create simple documentation:
* System requirements
* Installation instructions
* Basic usage guide

### Package for sharing:
* Create requirements.txt
* Prepare Docker container (optional)
* Include test molecules and protein structure

This stripped-down approach focuses only on the essential components needed to demonstrate the concept, with minimal ML components and a focus on the core functionality of predicting covalent binding to MK2.