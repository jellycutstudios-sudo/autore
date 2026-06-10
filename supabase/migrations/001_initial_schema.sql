-- ============================================================
-- AutoRe Database Schema
-- Run this in your Supabase SQL Editor
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── users ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.users (
  id                  UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email               TEXT NOT NULL,
  phone_number        TEXT,
  stripe_customer_id  TEXT UNIQUE,
  subscription_status TEXT NOT NULL DEFAULT 'inactive'
    CHECK (subscription_status IN ('active', 'inactive', 'past_due', 'trialing')),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-populate users row on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, email)
  VALUES (NEW.id, NEW.email)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- updated_at auto-update
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─── google_connections ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.google_connections (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id            UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  google_account_id  TEXT NOT NULL,
  access_token       TEXT NOT NULL,
  refresh_token      TEXT NOT NULL,
  token_expires_at   TIMESTAMPTZ NOT NULL,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, google_account_id)
);

CREATE TRIGGER google_connections_updated_at
  BEFORE UPDATE ON public.google_connections
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─── locations ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.locations (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id              UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  google_location_id   TEXT NOT NULL,
  business_name        TEXT NOT NULL,
  address              TEXT,
  auto_reply_enabled   BOOLEAN NOT NULL DEFAULT TRUE,
  tone_guidelines      TEXT DEFAULT 'Professional, friendly, and appreciative. Keep it concise.',
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, google_location_id)
);

CREATE TRIGGER locations_updated_at
  BEFORE UPDATE ON public.locations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─── reviews ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.reviews (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  location_id       UUID NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  google_review_id  TEXT NOT NULL UNIQUE,
  author_name       TEXT NOT NULL,
  star_rating       SMALLINT NOT NULL CHECK (star_rating BETWEEN 1 AND 5),
  review_text       TEXT,
  review_url        TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),  -- when Google says it was posted
  fetched_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()   -- when we fetched it
);

CREATE INDEX reviews_location_id_idx ON public.reviews(location_id);
CREATE INDEX reviews_star_rating_idx ON public.reviews(star_rating);

-- ─── replies ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.replies (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  review_id         UUID NOT NULL REFERENCES public.reviews(id) ON DELETE CASCADE,
  draft_text        TEXT,
  final_posted_text TEXT,
  status            TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'approved', 'posted', 'failed')),
  google_error_log  TEXT,
  posted_at         TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (review_id)
);

CREATE TRIGGER replies_updated_at
  BEFORE UPDATE ON public.replies
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- Row Level Security (RLS)
-- Users can only see and modify their own data
-- ============================================================

ALTER TABLE public.users              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.google_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.locations          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.replies            ENABLE ROW LEVEL SECURITY;

-- users: only own row
CREATE POLICY "users_self_access" ON public.users
  FOR ALL USING (auth.uid() = id);

-- google_connections: only own connections
CREATE POLICY "google_connections_self_access" ON public.google_connections
  FOR ALL USING (auth.uid() = user_id);

-- locations: only own locations
CREATE POLICY "locations_self_access" ON public.locations
  FOR ALL USING (auth.uid() = user_id);

-- reviews: only via own locations
CREATE POLICY "reviews_self_access" ON public.reviews
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.locations l
      WHERE l.id = reviews.location_id
        AND l.user_id = auth.uid()
    )
  );

-- replies: only via own reviews → locations
CREATE POLICY "replies_self_access" ON public.replies
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.reviews r
      JOIN public.locations l ON l.id = r.location_id
      WHERE r.id = replies.review_id
        AND l.user_id = auth.uid()
    )
  );
