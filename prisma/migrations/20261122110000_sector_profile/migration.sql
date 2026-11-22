-- Additive-only Sector Profile support. Apply after the initial schema migration.
ALTER TYPE "DestinationType" ADD VALUE IF NOT EXISTS 'SECTOR_PROFILE';
