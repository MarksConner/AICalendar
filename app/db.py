from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import NullPool

DATABASE_URL = "postgresql://postgres.qtsoduzzgzphapjzfkld:xtgd4s8jHxLsedbL@aws-1-us-east-1.pooler.supabase.com:5432/postgres"
engine = create_engine(DATABASE_URL,pool_size=3,max_overflow=0,pool_timeout=30,pool_pre_ping=True,pool_recycle=300) #Modify to avoid pool overflow
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

