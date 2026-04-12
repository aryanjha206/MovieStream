import os
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv()
mongo_uri = os.getenv("MONGO_URI", "mongodb://localhost:27017/")
client = MongoClient(mongo_uri)
db = client[os.getenv("MONGO_DB_NAME", "movie_stream")]

users = list(db.users.find().limit(5))
for u in users:
    print(f"Name: {u.get('name')}")
    print(f"Created At Type: {type(u.get('created_at'))}")
    print(f"Updated At Type: {type(u.get('updated_at'))}")
    print("---")
