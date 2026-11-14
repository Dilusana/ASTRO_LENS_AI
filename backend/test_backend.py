"""End-to-end test of the FastAPI backend search_observations function."""
import asyncio
import sys
sys.path.insert(0, '.')

from app.spherex import search_observations


async def main():
    # M31 Andromeda Galaxy: RA=10.68458333, Dec=41.26875
    print("Testing M31 (Andromeda Galaxy)...")
    result = await search_observations(10.68458333, 41.26875, 0.01, 10)
    print(f"count: {result['count']}")
    print(f"collection: {result['query']['collection']}")
    print(f"truncated: {result['truncated']}")
    print(f"repeat_coverage_found: {result['comparable']['repeat_coverage_found']}")
    print(f"\nBand summary:")
    for band in result['comparable']['bands']:
        print(f"  {band}")
    if result['observations']:
        obs = result['observations'][0]
        print(f"\nFirst observation:")
        for k, v in obs.items():
            print(f"  {k}: {v!r}")


asyncio.run(main())
