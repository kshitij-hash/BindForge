import argparse
import json
from pathlib import Path
from typing import Dict, List, Optional

import requests
from loguru import logger


class MK2Downloader:
    """
    A class to download MK2 protein structures from the RCSB PDB database.
    """

    BASE_URL = "https://data.rcsb.org/rest/v1/core"
    SEARCH_URL = "https://search.rcsb.org/rcsbsearch/v2/query"
    DOWNLOAD_URL = "https://files.rcsb.org/download"

    def __init__(self, output_dir: str = "data/raw"):
        """
        Initialize the MK2 downloader.

        Args:
            output_dir: Directory to store downloaded PDB files
        """
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)
        logger.info(f"MK2 Downloader initialized. Output directory: {self.output_dir}")

    def create_mk2_query(
        self, resolution_cutoff: float = 3.0, specific_pdb_id: str = None
    ) -> Dict:
        """
        Create a search query for MK2 protein structures.

        Args:
            resolution_cutoff: Maximum resolution in Angstroms
            specific_pdb_id: Optional specific PDB ID to search for (e.g., 3M2W)

        Returns:
            Query dictionary for the RCSB Search API
        """
        query = {
            "query": {
                "type": "group",
                "logical_operator": "and",
                "nodes": [
                    {
                        "type": "terminal",
                        "service": "text",
                        "parameters": {
                            "attribute": "entity_poly.rcsb_entity_polymer_type",
                            "operator": "exact_match",
                            "value": "Protein",
                        },
                    },
                    {
                        "type": "group",
                        "logical_operator": "or",
                        "nodes": [
                            {
                                "type": "terminal",
                                "service": "text",
                                "parameters": {
                                    "attribute": "struct.title",
                                    "operator": "contains_words",
                                    "value": "MAPKAP kinase 2",
                                },
                            },
                            {
                                "type": "terminal",
                                "service": "text",
                                "parameters": {
                                    "attribute": "struct.title",
                                    "operator": "contains_words",
                                    "value": "MAPKAP-kinase 2",
                                },
                            },
                            {
                                "type": "terminal",
                                "service": "text",
                                "parameters": {
                                    "attribute": "struct.title",
                                    "operator": "contains_words",
                                    "value": "MK2",
                                },
                            },
                            {
                                "type": "terminal",
                                "service": "text",
                                "parameters": {
                                    "attribute": "struct.title",
                                    "operator": "contains_words",
                                    "value": "MAPKAPK2",
                                },
                            },
                            {
                                "type": "terminal",
                                "service": "text",
                                "parameters": {
                                    "attribute": "struct.title",
                                    "operator": "contains_words",
                                    "value": "MAPKAPK-2",
                                },
                            },
                            {
                                "type": "terminal",
                                "service": "text",
                                "parameters": {
                                    "attribute": "rcsb_entity_source_organism.rcsb_gene_name.comp_id",
                                    "operator": "exact_match",
                                    "value": "MAPKAPK2",
                                },
                            },
                            {
                                "type": "terminal",
                                "service": "text",
                                "parameters": {
                                    "attribute": "rcsb_polymer_entity_container_identifiers.uniprot_ids",
                                    "operator": "exact_match",
                                    "value": "P49137",
                                },
                            },
                        ],
                    },
                ],
            },
            "return_type": "entry",
            "request_options": {
                "paginate": {"start": 0, "rows": 200},
                "scoring_strategy": "combined",
                "sort": [
                    {
                        "sort_by": "rcsb_entry_info.resolution_combined",
                        "direction": "asc",
                    }
                ],
            },
        }

        # Add resolution filter only if not looking for a specific PDB ID
        if not specific_pdb_id:
            query["query"]["nodes"].append(
                {
                    "type": "terminal",
                    "service": "text",
                    "parameters": {
                        "attribute": "rcsb_entry_info.resolution_combined",
                        "operator": "less_or_equal",
                        "value": resolution_cutoff,
                    },
                }
            )

        # If a specific PDB ID is provided, add it to the query
        if specific_pdb_id:
            query["query"]["nodes"].append(
                {
                    "type": "terminal",
                    "service": "text",
                    "parameters": {
                        "attribute": "rcsb_entry_container_identifiers.entry_id",
                        "operator": "exact_match",
                        "value": specific_pdb_id.upper(),
                    },
                }
            )

        return query

    # Add a fallback method if the main query doesn't work
    def create_simple_mk2_query(self, specific_pdb_id: str = None) -> Dict:
        """Create a simplified query for MK2 structures when the main query fails."""
        query = {
            "query": {
                "type": "group",
                "logical_operator": "or",
                "nodes": [
                    {
                        "type": "terminal",
                        "service": "text",
                        "parameters": {
                            "attribute": "rcsb_polymer_entity.pdbx_description",
                            "operator": "contains_phrase",
                            "value": "MAP KINASE-ACTIVATED PROTEIN KINASE 2",
                        },
                    },
                    {
                        "type": "terminal",
                        "service": "text",
                        "parameters": {
                            "attribute": "struct.title",
                            "operator": "contains_phrase",
                            "value": "MK2",
                        },
                    },
                ],
            },
            "return_type": "entry",
            "request_options": {
                "paginate": {"start": 0, "rows": 200},
                "scoring_strategy": "combined",
            },
        }
        
        if specific_pdb_id:
            query["query"]["nodes"].append(
                {
                    "type": "terminal",
                    "service": "text",
                    "parameters": {
                        "attribute": "rcsb_entry_container_identifiers.entry_id",
                        "operator": "exact_match",
                        "value": specific_pdb_id.upper(),
                    },
                }
            )
            
        return query

    def search_mk2_structures(
        self, resolution_cutoff: float = 3.0, specific_pdb_id: str = None
    ) -> List[str]:
        """
        Search for MK2 protein structures.

        Args:
            resolution_cutoff: Maximum resolution in Angstroms
            specific_pdb_id: Optional specific PDB ID to search for

        Returns:
            List of PDB IDs matching the query
        """
        # Try with the main query first
        query = self.create_mk2_query(resolution_cutoff, specific_pdb_id)
        logger.debug(f"Sending MK2 query to RCSB: {json.dumps(query, indent=2)}")

        try:
            response = requests.post(self.SEARCH_URL, json=query)
            logger.debug(f"Response status code: {response.status_code}")

            # If main query fails, try fallback query
            if response.status_code != 200:
                logger.warning(f"Main query failed with status {response.status_code}, trying simplified query")
                query = self.create_simple_mk2_query(specific_pdb_id)
                logger.debug(f"Sending simplified MK2 query to RCSB: {json.dumps(query, indent=2)}")
                response = requests.post(self.SEARCH_URL, json=query)
                logger.debug(f"Simplified query response status code: {response.status_code}")

            # Handle 204 No Content response
            if response.status_code == 204:
                logger.warning(
                    "Received status 204 (No Content) - No structures found matching criteria"
                )
                return []

            if response.status_code != 200:
                logger.error(
                    f"API error: Status {response.status_code}, Response: {response.text}"
                )
                return []

            try:
                response_data = response.json()
            except ValueError:
                logger.error(f"Invalid JSON response: {response.text}")
                return []

            results = response_data.get("result_set", [])
            pdb_ids = [result["identifier"].split("_")[0] for result in results]

            # If searching for structures by resolution, filter them here
            if not specific_pdb_id and query == self.create_simple_mk2_query():
                # Filter by resolution manually for the simple query
                filtered_pdb_ids = []
                logger.info(f"Filtering {len(pdb_ids)} structures by resolution (<= {resolution_cutoff}Å)")
                for pdb_id in pdb_ids[:20]:  # Limit to first 20 to avoid too many API calls
                    metadata = self.get_metadata(pdb_id)
                    if "refine" in metadata and len(metadata["refine"]) > 0:
                        res = metadata["refine"][0].get("ls_dres_high")
                        if res and float(res) <= resolution_cutoff:
                            filtered_pdb_ids.append(pdb_id)
                            logger.debug(f"Structure {pdb_id} passes resolution filter: {res}Å")
                        else:
                            logger.debug(f"Structure {pdb_id} filtered out: {res}Å > {resolution_cutoff}Å")
                pdb_ids = filtered_pdb_ids

            logger.info(
                f"Found {len(pdb_ids)} MK2 protein structures matching the query"
            )
            if pdb_ids:
                logger.info(f"PDB IDs found: {', '.join(pdb_ids)}")
            return pdb_ids

        except requests.exceptions.RequestException as e:
            logger.error(f"Error searching PDB: {e}")
            return []
        except Exception as e:
            logger.error(f"Unexpected error: {e}")
            return []

    def download_structure(
        self, pdb_id: str, file_format: str = "pdb"
    ) -> Optional[Path]:
        """
        Download a specific MK2 structure.

        Args:
            pdb_id: The PDB ID to download
            file_format: Format to download (pdb, cif, xml, etc.)

        Returns:
            Path to the downloaded file or None if download failed
        """
        pdb_id = pdb_id.lower()

        # Determine correct file extension and URL extension
        if file_format == "pdb":
            file_ext = "pdb"
            url_ext = "pdb"
        else:
            file_ext = file_format
            url_ext = file_format

        output_file = self.output_dir / f"{pdb_id}.{file_ext}"

        # Skip if file already exists
        if output_file.exists():
            logger.debug(f"File {output_file} already exists, skipping download")
            return output_file

        try:
            url = f"{self.DOWNLOAD_URL}/{pdb_id}.{url_ext}"
            logger.debug(f"Downloading from URL: {url}")

            response = requests.get(url)
            response.raise_for_status()

            with open(output_file, "wb") as f:
                f.write(response.content)

            logger.info(f"Downloaded MK2 structure {pdb_id} to {output_file}")
            return output_file
        except requests.exceptions.RequestException as e:
            logger.error(f"Error downloading {pdb_id}: {e}")
            return None

    def get_metadata(self, pdb_id: str) -> Dict:
        """
        Fetch metadata for an MK2 structure.

        Args:
            pdb_id: The PDB ID

        Returns:
            Dictionary containing metadata
        """
        try:
            url = f"{self.BASE_URL}/entry/{pdb_id}"
            response = requests.get(url)
            response.raise_for_status()
            metadata = response.json()

            # Extract and display key information
            title = metadata.get("struct", {}).get("title", "Unknown")
            resolution = "Unknown"

            if "refine" in metadata and len(metadata["refine"]) > 0:
                resolution = metadata["refine"][0].get("ls_dres_high", "Unknown")

            method = "Unknown"
            if "exptl" in metadata and len(metadata["exptl"]) > 0:
                method = metadata["exptl"][0].get("method", "Unknown")

            logger.info(f"Metadata for {pdb_id}:")
            logger.info(f"Title: {title}")
            logger.info(f"Resolution: {resolution} Å")
            logger.info(f"Experimental Method: {method}")

            return metadata
        except requests.exceptions.RequestException as e:
            logger.error(f"Error fetching metadata for {pdb_id}: {e}")
            return {}


def main():
    """
    Main function to download MK2 structures based on command line arguments.
    """
    # Parse command line arguments
    parser = argparse.ArgumentParser(
        description="Download MK2 protein structures from RCSB PDB."
    )
    parser.add_argument(
        "--download",
        type=int,
        default=1,
        help="Number of structures to download (default: 1, use a larger number to download multiple structures)",
    )
    parser.add_argument(
        "--resolution",
        type=float,
        default=3.0,
        help="Maximum resolution cutoff in Angstroms (default: 3.0)",
    )
    parser.add_argument("--pdb-id", type=str, help="Specific PDB ID to download")
    parser.add_argument(
        "--output-dir",
        type=str,
        default="data/raw",
        help="Directory to store downloaded files",
    )
    parser.add_argument(
        "--auto-confirm", 
        action="store_true",
        help="Automatically confirm downloads without prompting",
    )
    args = parser.parse_args()

    # Setup logging
    logger.remove()
    logger.add(
        lambda msg: print(msg, end=""),
        colorize=True,
        format="<green>{time:YYYY-MM-DD HH:mm:ss}</green> | <level>{level: <8}</level> | <cyan>{function}</cyan>:<cyan>{line}</cyan> - <level>{message}</level>",
    )

    # Initialize downloader
    output_dir = args.output_dir
    downloader = MK2Downloader(output_dir)

    # If specific PDB ID is provided
    if args.pdb_id:
        logger.info(f"Searching for specific MK2 structure: {args.pdb_id}")
        pdb_ids = downloader.search_mk2_structures(
            resolution_cutoff=args.resolution, specific_pdb_id=args.pdb_id
        )
    else:
        logger.info(
            f"Searching for MK2 structures with resolution <= {args.resolution}Å..."
        )
        pdb_ids = downloader.search_mk2_structures(resolution_cutoff=args.resolution)

    if not pdb_ids:
        logger.error("No MK2 structures found. Exiting.")
        return

    # Determine which structures to download
    if args.download > len(pdb_ids):
        download_list = pdb_ids
        logger.info(f"Will download all {len(pdb_ids)} available structures")
    elif args.download > 1:
        # Use the specified number of structures
        download_list = pdb_ids[:args.download]
        logger.info(f"Will download the top {args.download} structures")
    else:
        download_list = [pdb_ids[0]]
        logger.info(f"Selected best MK2 structure: {pdb_ids[0]}")
    
    # Ask for confirmation if downloading multiple structures and not auto-confirmed
    if len(download_list) > 1 and not args.auto_confirm:
        confirm = input(f"Are you sure you want to download {len(download_list)} structures? (y/n): ")
        if confirm.lower() != 'y':
            logger.info("Download cancelled by user.")
            return

    # Download selected structures
    metadata_dir = Path("data/processed")
    metadata_dir.mkdir(parents=True, exist_ok=True)

    for target_pdb_id in download_list:
        logger.info(f"Processing structure: {target_pdb_id}")

        # Download the structure
        pdb_file = downloader.download_structure(target_pdb_id)
        if pdb_file:
            logger.info(f"Successfully downloaded MK2 structure to {pdb_file}")

            # Get metadata
            metadata = downloader.get_metadata(target_pdb_id)

            # Save metadata to a JSON file
            with open(metadata_dir / f"{target_pdb_id}_metadata.json", "w") as f:
                json.dump(metadata, f, indent=2)
                logger.info(
                    f"Saved metadata to {metadata_dir / f'{target_pdb_id}_metadata.json'}"
                )
        else:
            logger.error(f"Failed to download MK2 structure {target_pdb_id}")


if __name__ == "__main__":
    main()
