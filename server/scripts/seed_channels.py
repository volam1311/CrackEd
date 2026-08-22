"""Seed the channels collection with initial whitelisted YouTube channels."""

import os
from datetime import UTC, datetime

from pymongo import MongoClient

MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017")
MONGO_DB = os.getenv("MONGO_DB", "cracked")

CHANNELS = [
    {
        "_id": "UCCEdvAoqlElUvVn",
        "title": "StatQuest with Josh Starmer",
        "thumbnail_url": None,
    },
    {
        "_id": "UCYO_jab_esuFRV4b17AJtAw",
        "title": "3Blue1Brown",
        "thumbnail_url": None,
    },
]


def main():
    client = MongoClient(MONGO_URL)
    db = client[MONGO_DB]

    for channel in CHANNELS:
        result = db.channels.update_one(
            {"_id": channel["_id"]},
            {
                "$set": {"title": channel["title"], "thumbnail_url": channel["thumbnail_url"]},
                "$setOnInsert": {"added_at": datetime.now(UTC)},
            },
            upsert=True,
        )
        if result.upserted_id:
            print(f"  Inserted: {channel['title']} ({channel['_id']})")
        else:
            print(f"  Updated:  {channel['title']} ({channel['_id']})")

    print(f"\nDone. {db.channels.count_documents({})} channel(s) in collection.")
    client.close()


if __name__ == "__main__":
    print(f"Seeding channels into {MONGO_URL}/{MONGO_DB} ...\n")
    main()
