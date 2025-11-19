-- Create user_packs table to track pack ownership and opening status
CREATE TABLE IF NOT EXISTS public.user_packs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  pack_id UUID NOT NULL REFERENCES public.packs(id) ON DELETE CASCADE,
  is_opened BOOLEAN NOT NULL DEFAULT false,
  opened_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_packs_user_id ON public.user_packs(user_id);
CREATE INDEX IF NOT EXISTS idx_user_packs_team_id ON public.user_packs(team_id);
CREATE INDEX IF NOT EXISTS idx_user_packs_pack_id ON public.user_packs(pack_id);
CREATE INDEX IF NOT EXISTS idx_user_packs_is_opened ON public.user_packs(is_opened);

-- Enable RLS
ALTER TABLE public.user_packs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own packs"
ON public.user_packs
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own packs"
ON public.user_packs
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own packs"
ON public.user_packs
FOR UPDATE
USING (auth.uid() = user_id);

-- Add updated_at trigger
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.user_packs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
