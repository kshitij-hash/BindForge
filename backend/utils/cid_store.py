import os
import json
from pathlib import Path

# Configuration
RUST_SERVER_URL = os.getenv("RUST_SERVER_URL", "http://127.0.0.1:8080")
USE_SOLANA = os.getenv("USE_SOLANA", "false").lower() == "true"

# Default keypair path - matches Solana CLI's default location
KEYPAIR_PATH = os.path.expanduser("/home/kshitij/dev/ai-docking-1/account_key_pair.json")

async def store_cid_on_solana(cid: str):
    """
    Store a CID either on Solana or using the local Rust implementation

    Args:
        cid: The IPFS CID to store

    Returns:
        dict: Operation details
    """
    if USE_SOLANA:
        # Implement Solana-based CID storage
        from solders.keypair import Keypair
        from solders.pubkey import Pubkey
        from solana.rpc.api import Client
        from solders.transaction import Transaction
        from solders.instruction import Instruction, AccountMeta
        from solders.message import Message
        from solders.rpc.responses import GetLatestBlockhashResp

        # Load existing keypair
        try:
            keypair_path = Path(KEYPAIR_PATH)
            if keypair_path.exists():
                with open(keypair_path, 'r') as f:
                    keypair_bytes = bytes(json.load(f))
                    account_keypair = Keypair.from_bytes(keypair_bytes)
            else:
                return {
                    "status": "failed",
                    "error": "No keypair found",
                    "details": f"Please create a funded Solana keypair at {KEYPAIR_PATH} using 'solana-keygen new'"
                }
        except Exception as e:
            return {
                "status": "failed",
                "error": "Failed to load keypair",
                "details": str(e)
            }

        account_key = str(account_keypair.pubkey())

        # Connect to Solana network - use appropriate endpoint based on environment
        solana_client = Client("https://api.devnet.solana.com")
        
        # Verify account has SOL balance
        balance_response = solana_client.get_balance(account_keypair.pubkey())
        if balance_response.value == 0:
            return {
                "status": "failed",
                "error": "Account has no SOL",
                "details": f"Please fund the account {account_key} with SOL using 'solana airdrop 1'"
            }
        
        # Get recent blockhash
        blockhash_response = solana_client.get_latest_blockhash()
        if not isinstance(blockhash_response, GetLatestBlockhashResp) or blockhash_response.value is None:
            return {
                "status": "failed",
                "error": "Failed to get blockhash",
                "details": str(blockhash_response)
            }
            
        recent_blockhash = blockhash_response.value.blockhash
        print(f"[DEBUG] Using blockhash: {recent_blockhash}")

        # Get program ID from the smart contract - ensure it's a proper PublicKey
        program_id_str = "3oYm2ArhEFxH42uBZpsEqBzqfrWH4xquop4oNStTJ6M6"
        program_id = Pubkey.from_string(program_id_str)
        print(f"[DEBUG] Program ID: {program_id}")

        # Prepare instruction data 
        instruction_data = f"store_cid {cid}".encode()
        print(f"[DEBUG] Instruction data: {instruction_data}")
        
        # Create instruction with proper account metadata
        accounts = [
            AccountMeta(account_keypair.pubkey(), is_signer=True, is_writable=True)
        ]
        print(f"[DEBUG] Accounts: {accounts}")
        
        instruction = Instruction(
            program_id=program_id,
            accounts=accounts,
            data=instruction_data
        )
        print(f"[DEBUG] Instruction created: {instruction}")
        
        # Create message from instruction
        print(f"[DEBUG] Creating message with instruction and pubkey: {account_keypair.pubkey()}")
        message = Message.new_with_blockhash(
            [instruction], 
            account_keypair.pubkey(),  # Payer/fee payer
            recent_blockhash
        )
        
        # Create transaction with proper parameters
        transaction = Transaction.new_unsigned(message)
        transaction.sign([account_keypair], recent_blockhash)

        # Send transaction
        result = solana_client.send_transaction(transaction)
        print(result)

        if result.value is not None:
            tx_signature = str(result.value)
            return {
                "account": account_key,
                "status": "success",
                "cid": cid,
                "store_signature": tx_signature, 
            }
        else:
            return {
                "account": account_key,
                "status": "failed",
                "error": "Transaction failed",
                "details": str(result),
                "store_signature": None,  
            }
    else:
        # Not using Solana, inform the user
        return {
            "status": "failed",
            "error": "Solana not enabled",
            "details": "Please enable Solana to use this feature",
        }