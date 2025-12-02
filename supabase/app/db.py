from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import NullPool

DATABASE_URL = "postgresql://postgres.qtsoduzzgzphapjzfkld:xtgd4s8jHxLsedbL@aws-1-us-east-1.pooler.supabase.com:5432/postgres"
engine = create_engine(DATABASE_URL, pool_pre_ping=True,poolclass=NullPool,)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

