import os
import pandas as pd
from datetime import datetime
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib.enums import TA_CENTER, TA_LEFT

def generate_docking_report(docking_results, protein_info, molecule_info, output_dir):
    """
    Generate a detailed PDF report from docking results
    
    Args:
        docking_results (dict): Docking analysis results
        protein_info (dict): Information about the protein
        molecule_info (dict): Information about the molecule
        output_dir (str): Directory to save the report
        
    Returns:
        str: Path to the generated report
    """
    os.makedirs(output_dir, exist_ok=True)
    
    # Create timestamp for filename
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    report_filename = f"docking_report_{timestamp}.pdf"
    report_path = os.path.join(output_dir, report_filename)
    
    # Create the PDF document
    doc = SimpleDocTemplate(
        report_path,
        pagesize=letter,
        rightMargin=72,
        leftMargin=72,
        topMargin=72,
        bottomMargin=72
    )
    
    # Get styles
    styles = getSampleStyleSheet()
    title_style = styles["Title"]
    heading1_style = styles["Heading1"]
    heading2_style = styles["Heading2"]
    normal_style = styles["Normal"]
    
    # Create a custom style for centered text
    centered_style = ParagraphStyle(
        name='Centered',
        parent=normal_style,
        alignment=TA_CENTER
    )
    
    # Create elements list for the PDF
    elements = []
    
    # Title
    elements.append(Paragraph("BindForge Docking Analysis Report", title_style))
    elements.append(Spacer(1, 0.25 * inch))
    
    # Date
    elements.append(Paragraph(f"Generated on {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}", normal_style))
    elements.append(Spacer(1, 0.5 * inch))
    
    # Protein Information
    elements.append(Paragraph("Protein Information", heading1_style))
    elements.append(Spacer(1, 0.1 * inch))
    
    protein_data = [
        ["Parameter", "Value"],
        ["Name", protein_info.get("name", "N/A")],
        ["PDB ID", protein_info.get("pdb_id", "N/A")],
        ["Number of Cysteines", str(len(protein_info.get("cysteines", [])))],
    ]
    
    protein_table = Table(protein_data, colWidths=[2*inch, 3*inch])
    protein_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (1, 0), colors.lightgrey),
        ('TEXTCOLOR', (0, 0), (1, 0), colors.black),
        ('ALIGN', (0, 0), (1, 0), 'CENTER'),
        ('FONTNAME', (0, 0), (1, 0), 'Helvetica-Bold'),
        ('BOTTOMPADDING', (0, 0), (1, 0), 12),
        ('GRID', (0, 0), (-1, -1), 1, colors.black),
    ]))
    
    elements.append(protein_table)
    elements.append(Spacer(1, 0.25 * inch))
    
    # Cysteines
    elements.append(Paragraph("Identified Cysteines", heading2_style))
    elements.append(Spacer(1, 0.1 * inch))
    
    if protein_info.get("cysteines"):
        cys_data = [["Chain", "Residue Number", "Residue Name"]]
        
        for cys in protein_info.get("cysteines", []):
            cys_data.append([
                cys.get("chain", "N/A"),
                str(cys.get("residue_number", "N/A")),
                cys.get("residue_name", "N/A")
            ])
        
        cys_table = Table(cys_data, colWidths=[1.5*inch, 1.5*inch, 1.5*inch])
        cys_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.lightgrey),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.black),
            ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('GRID', (0, 0), (-1, -1), 1, colors.black),
        ]))
        
        elements.append(cys_table)
    else:
        elements.append(Paragraph("No cysteine residues identified", normal_style))
    
    elements.append(Spacer(1, 0.5 * inch))
    
    # Molecule Information
    elements.append(Paragraph("Molecule Information", heading1_style))
    elements.append(Spacer(1, 0.1 * inch))
    
    mol_data = [["Parameter", "Value"]]
    
    for key, value in molecule_info.items():
        if key != "smiles":  # Handle SMILES separately
            mol_data.append([key.capitalize(), str(value)])
    
    # Add SMILES at the end
    mol_data.append(["SMILES", molecule_info.get("smiles", "N/A")])
    
    mol_table = Table(mol_data, colWidths=[2*inch, 3*inch])
    mol_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (1, 0), colors.lightgrey),
        ('TEXTCOLOR', (0, 0), (1, 0), colors.black),
        ('ALIGN', (0, 0), (1, 0), 'CENTER'),
        ('FONTNAME', (0, 0), (1, 0), 'Helvetica-Bold'),
        ('BOTTOMPADDING', (0, 0), (1, 0), 12),
        ('GRID', (0, 0), (-1, -1), 1, colors.black),
    ]))
    
    elements.append(mol_table)
    elements.append(Spacer(1, 0.5 * inch))
    
    # Docking Results
    elements.append(Paragraph("Docking Results", heading1_style))
    elements.append(Spacer(1, 0.1 * inch))
    
    # Summary box
    elements.append(Paragraph("Summary", heading2_style))
    elements.append(Spacer(1, 0.1 * inch))
    
    summary_data = [
        ["Metric", "Value"],
        ["Best Binding Affinity", f"{docking_results.get('best_affinity', 'N/A')} kcal/mol"],
        ["Covalent Binding Potential", f"{docking_results.get('covalent_potential', 'Unknown')}"],
        ["Warhead Distance", f"{docking_results.get('warhead_distance', 'N/A')} Å"]
    ]
    
    summary_table = Table(summary_data, colWidths=[2.5*inch, 2.5*inch])
    summary_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (1, 0), colors.lightgrey),
        ('TEXTCOLOR', (0, 0), (1, 0), colors.black),
        ('ALIGN', (0, 0), (1, 0), 'CENTER'),
        ('FONTNAME', (0, 0), (1, 0), 'Helvetica-Bold'),
        ('BOTTOMPADDING', (0, 0), (1, 0), 12),
        ('BACKGROUND', (0, 1), (-1, -1), colors.lightblue),
        ('GRID', (0, 0), (-1, -1), 1, colors.black),
    ]))
    
    elements.append(summary_table)
    elements.append(Spacer(1, 0.25 * inch))
    
    # Docking Poses
    elements.append(Paragraph("Docking Poses", heading2_style))
    elements.append(Spacer(1, 0.1 * inch))
    
    if "poses" in docking_results and docking_results["poses"]:
        poses_data = [["Pose", "Affinity (kcal/mol)", "RMSD LB", "RMSD UB"]]
        
        for i, pose in enumerate(docking_results["poses"]):
            poses_data.append([
                str(i+1),
                str(pose.get("affinity", "N/A")),
                str(pose.get("rmsd_lb", "N/A")),
                str(pose.get("rmsd_ub", "N/A"))
            ])
        
        poses_table = Table(poses_data, colWidths=[1*inch, 2*inch, 1*inch, 1*inch])
        poses_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.lightgrey),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.black),
            ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('GRID', (0, 0), (-1, -1), 1, colors.black),
        ]))
        
        elements.append(poses_table)
    else:
        elements.append(Paragraph("No docking poses available", normal_style))
    
    elements.append(Spacer(1, 0.5 * inch))
    
    # Analysis and Recommendations
    elements.append(Paragraph("Analysis and Recommendations", heading1_style))
    elements.append(Spacer(1, 0.1 * inch))
    
    if docking_results.get("recommendations"):
        for recommendation in docking_results["recommendations"]:
            elements.append(Paragraph(f"• {recommendation}", normal_style))
            elements.append(Spacer(1, 0.1 * inch))
    else:
        elements.append(Paragraph("No specific recommendations available.", normal_style))
    
    elements.append(Spacer(1, 0.5 * inch))
    
    # Footer
    elements.append(Paragraph("Generated by BindForge - AI-Enhanced Covalent Docking Prediction Tool", 
                             ParagraphStyle(name='Footer', parent=normal_style, fontSize=8, textColor=colors.grey)))
    
    # Build the PDF
    doc.build(elements)
    
    return report_path