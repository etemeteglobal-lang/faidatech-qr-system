-- Additive only: enables the custom/other sector without changing existing rows.
ALTER TYPE "VerticalSector" ADD VALUE IF NOT EXISTS 'OTHER';
