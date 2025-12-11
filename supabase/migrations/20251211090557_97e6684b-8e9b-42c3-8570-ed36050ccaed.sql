-- Create locations table for dynamic location management
CREATE TABLE public.locations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL UNIQUE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;

-- Everyone can read locations
CREATE POLICY "locations_select_all" ON public.locations
  FOR SELECT USING (true);

-- Authenticated users can insert locations
CREATE POLICY "locations_insert_authenticated" ON public.locations
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- No update or delete allowed (locations persist forever)
-- Intentionally not creating UPDATE or DELETE policies

-- Seed with existing locations from constants
INSERT INTO public.locations (name) VALUES
  ('Al Barari'), ('Al Furjan'), ('Al Jaddaf'), ('Al Jurf'), ('Al Mamsha'),
  ('Al Marjan Island'), ('Al Qasimia City'), ('Al Reem Island'), ('Al Sufouh'),
  ('Al Zorah City'), ('Aljada'), ('Arabian Hills Estate'), ('Arabian Ranches 3'),
  ('Arjan'), ('Bluewaters Island'), ('Business Bay'), ('City Walk'), ('Damac Hills'),
  ('Damac Hills 2'), ('Damac Lagoons'), ('Damac Riverside'), ('DIFC'), ('Downtown Dubai'),
  ('Downtown UAQ'), ('Dubai Creek Harbour'), ('Dubai Design District'), ('Dubai Harbour'),
  ('Dubai Hills Estate'), ('Dubai International City'), ('Dubai Investment Park'),
  ('Dubai Islands'), ('Dubai Marina'), ('Dubai Maritime City'), ('Dubai Motor City'),
  ('Dubai Production City'), ('Dubai Science Park'), ('Dubai Silicon Oasis'), ('Dubai South'),
  ('Emaar South'), ('Expo City'), ('Dubai Sports City'), ('Dubai Studio City'),
  ('Dubai Water Canal'), ('Dubailand'), ('Athlon'), ('Damac Islands'), ('Damac Sun City'),
  ('Ghaf Woods'), ('Haven'), ('Mudon'), ('Sobha Elwood'), ('Sobha Reserve'), ('The Acres'),
  ('The Valley'), ('The Wilds'), ('Town Square'), ('Villanova'), ('Emaar Beachfront'),
  ('Emirates Living'), ('Emirates Hills'), ('Fahid Island'), ('Grand Polo Club and Resort'),
  ('Jebel Ali Village'), ('Jumeirah'), ('Jumeirah Bay'), ('Jumeirah Beach Residence'),
  ('Jumeirah Garden City'), ('Jumeirah Golf Estates'), ('Jumeirah Islands'),
  ('Jumeirah Lake Towers'), ('Jumeirah Park'), ('Jumeirah Village Circle'),
  ('Jumeirah Village Triangle'), ('Madinat Jumeirah Living'), ('Maryam Island'), ('Masaar'),
  ('MBR City'), ('Azizi Riviera'), ('District One'), ('Eden Hills'), ('Meydan'),
  ('Sobha Hartland'), ('Sobha Hartland II'), ('Mina Al Arab'), ('Downtown Mina'),
  ('Hayat Island'), ('Nad Al Sheba Gardens'), ('Palm Jebel Ali'), ('Palm Jumeirah'),
  ('Port De La Mer'), ('Rahman Island'), ('Rashid Yachts and Marina'), ('Saadiyat Island'),
  ('Sheikh Zayed Road'), ('Siniya Island'), ('The Heights Country Club and Wellness'),
  ('The Oasis'), ('Tilal Al Ghaf'), ('Wasl Gate'), ('Yas Island'), ('Za''abeel')
ON CONFLICT (name) DO NOTHING;