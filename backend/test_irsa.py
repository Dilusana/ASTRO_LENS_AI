"""Quick live test of IRSA SPHEREx SIA endpoint."""
import asyncio
import httpx

SIA_ENDPOINT = "https://irsa.ipac.caltech.edu/SIA"


async def main():
    # M31 Andromeda Galaxy: RA=10.68458, Dec=41.26875
    params = {
        "COLLECTION": "spherex_qr3",
        "POS": "circle 10.68458333 41.26875000 0.01000000",
        "MAXREC": "5",
        "RESPONSEFORMAT": "csv",
    }
    async with httpx.AsyncClient(timeout=httpx.Timeout(90.0, connect=20.0)) as client:
        resp = await client.get(SIA_ENDPOINT, params=params)
        print("Status:", resp.status_code)
        text = resp.text.lstrip("\ufeff")
        lines = text.splitlines()
        print("Lines returned:", len(lines))
        if lines:
            print("Headers:", lines[0][:400])
        if len(lines) > 1:
            print("Row 1:", lines[1][:400])
        if len(lines) == 1:
            print("(only header row, no data)")


asyncio.run(main())
