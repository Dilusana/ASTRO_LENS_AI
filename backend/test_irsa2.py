"""Quick live test of IRSA SPHEREx SIA endpoint - full column listing."""
import asyncio
import csv
import io
import httpx

SIA_ENDPOINT = "https://irsa.ipac.caltech.edu/SIA"


async def main():
    # M31 Andromeda Galaxy
    params = {
        "COLLECTION": "spherex_qr3",
        "POS": "circle 10.68458333 41.26875000 0.01000000",
        "MAXREC": "10",
        "RESPONSEFORMAT": "csv",
    }
    async with httpx.AsyncClient(timeout=httpx.Timeout(90.0, connect=20.0)) as client:
        resp = await client.get(SIA_ENDPOINT, params=params)
        print("Status:", resp.status_code)
        text = resp.text.lstrip("\ufeff")
        rows = list(csv.DictReader(io.StringIO(text)))
        print(f"Rows: {len(rows)}")
        if rows:
            print("\nAll column names:")
            for col in rows[0].keys():
                print(f"  {col!r:40s} = {rows[0][col]!r}")
            print("\n--- Row 2 (if exists) ---")
            if len(rows) > 1:
                for col in rows[1].keys():
                    print(f"  {col!r:40s} = {rows[1][col]!r}")


asyncio.run(main())
