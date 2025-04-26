import os 
import requests


# load all the enviroment variables 
load_dotenv() 


def upload_to_pinata(file_path, jwt_token):
    url = "https://api.pinata.cloud/pinning/pinFileToIPFS"

    if not jwt_token: 
        print("Error: JWT token not found") 
        return None

    headers = {
        "Authorization": f"Bearer {jwt_token}",
        "Content-Type": "application/json"
    }

    try:
        with open(file_path, "rb") as file:
            response = requests.post(url, files={"file": file}, headers=headers)
            response_data = response.json()

            if response.status_code == 200:
                cid = response_data.get("IpfsHash")
                print(f"File uploaded successfully: {cid}")
                return cid
            else: 
                print(f"Error uploading file: {response_data.get("error", 'Unknown error')}")
                return None

    except Exception as e: 
        print(f"HTTP Exception: Failed to upload PDF to Pinata, Error: {e}")
        return None
        