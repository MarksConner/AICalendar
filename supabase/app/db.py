from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker


DATABASE_URL = "postgresql://postgres.qtsoduzzgzphapjzfkld:xtgd4s8jHxLsedbL@aws-1-us-east-1.pooler.supabase.com:5432/postgres"
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(bind=engine)