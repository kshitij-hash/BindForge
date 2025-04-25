/**
 * Utility functions for handling protein structures
 */

export interface Cysteine {
  chain: string;
  residue_number: number;
  residue_name: string;
}

export interface ProteinData {
  path: string;
  filesystem_path?: string;
  name?: string;
  pdbId?: string;
  cysteines?: Cysteine[];
  chainGroups?: Record<string, number[]>;
  potentialDisulfideBonds?: any[];
}

/**
 * Prepare a protein for docking by uploading it to the server
 */
export async function prepareProtein(file: File): Promise<ProteinData> {
  try {
    // Create a FormData instance
    const formData = new FormData();
    formData.append('file', file);

    // Upload the file to prepare-protein endpoint
    const response = await fetch('http://localhost:8000/api/prepare-protein', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || 'Failed to prepare protein structure');
    }

    const data = await response.json();
    
    // Return structured protein data with URL and filesystem path
    return {
      path: `http://localhost:8000${data.cleaned_structure_url}`,
      filesystem_path: data.filesystem_path,
      name: file.name.split('.')[0],
      cysteines: data.cysteines,
      chainGroups: data.chain_groups,
      potentialDisulfideBonds: data.potential_disulfide_bonds,
    };
  } catch (error) {
    console.error('Error preparing protein:', error);
    throw error;
  }
}

/**
 * Validate if a protein structure is ready for docking
 */
export function validateProteinForDocking(protein?: ProteinData): boolean {
  if (!protein) return false;
  if (!protein.path) return false;
  
  return true;
}
