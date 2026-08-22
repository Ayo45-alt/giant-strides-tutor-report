-- ==========================================
-- Giant Strides Tutor Report System - Supabase Setup Script
-- ==========================================
-- Instructions:
-- 1. Go to your Supabase Dashboard.
-- 2. Click on the "SQL Editor" in the left sidebar menu.
-- 3. Click "New Query" and paste this entire script.
-- 4. Click the "Run" button at the top right of the editor.
-- ==========================================

-- 1. Create Tutors Directory Table
CREATE TABLE IF NOT EXISTS tutors (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Create Reports Submission Table
CREATE TABLE IF NOT EXISTS reports (
    id SERIAL PRIMARY KEY,
    tutor_name VARCHAR(255) NOT NULL,
    student_name VARCHAR(255) NOT NULL,
    class_date VARCHAR(20) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    topic VARCHAR(255) NOT NULL,
    assignment_given VARCHAR(5) NOT NULL,
    assignment_details TEXT,
    learner_observation TEXT NOT NULL,
    other_feedback TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Enable Row Level Security (RLS) on both tables
ALTER TABLE tutors ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- 4. Define Security Policies for Tutors Directory
-- Anyone (public) can read the list of active tutors to populate the autocomplete box
CREATE POLICY "Allow public read access to tutors" 
ON tutors FOR SELECT 
USING (true);

-- Only authenticated users (admins) can modify the tutors directory (add/delete)
CREATE POLICY "Allow admin full access to tutors" 
ON tutors FOR ALL 
TO authenticated 
USING (true)
WITH CHECK (true);

-- 5. Define Security Policies for Reports Table
-- Anyone (public tutors) can insert a daily report
CREATE POLICY "Allow public report submissions" 
ON reports FOR INSERT 
WITH CHECK (true);

-- Only authenticated users (admins) can read, update, or delete reports
CREATE POLICY "Allow admin full access to reports" 
ON reports FOR ALL 
TO authenticated 
USING (true)
WITH CHECK (true);

-- 6. Seed the 72 Official Tutor Names
INSERT INTO tutors (name) VALUES
('Opeyemi Otegbola'),
('Oladuntoye Florence Ayodeji'),
('Popoola Maria'),
('Habibat Adedoyin Meshioye'),
('Jesuware Esther Oliwamayowa'),
('OGUNLEYE GBENGA'),
('Johnbeloved Afolabi'),
('Eseosa Ehinmosan'),
('Omokolade Fatanmi'),
('Chibuzo Onuorah'),
('Yussuf Bidemi'),
('Aderemi Dolapo Emmanuel'),
('Ayooba Ademola'),
('Oluwasuyi Linda Oyindamola'),
('Chinweze Chibuzo Anene'),
('Ms. Lydia Oyekunle'),
('Mbah Blessing Chioma'),
('Oyebimpe Sunday'),
('Oladele Moses Oluwajuwonlo'),
('Ekene Nwadiogo Ugwu'),
('Oloyede Abdussamod Segun'),
('Loveth Oghwere'),
('Odunayo Blessing Okedare'),
('Adesiyan Hannah Joy'),
('Oni Gabriel'),
('Victoria Oyedokun'),
('Gloria Samuel Anayeokwu'),
('Mayowa Opeyemi Musa'),
('Taiwo Ayodeji Gbolagade'),
('CHIBUZO MACANTHONY'),
('Afolabi Akintunde Emmanuel'),
('Oluwasijibomi Akindele-Obe'),
('Abiodun Oyebola'),
('Abigael Taiwo'),
('Edonogie Osagie-Iyamu'),
('Odubiyi Oluwatamilore Eunice'),
('Sodiq Akanni Yusuf'),
('Michael Chukwudi Onwujekwe'),
('Ruth Ogechi Okafor'),
('Deborah Olumoye'),
('Oyedokun Samuel'),
('Ogunjinmi Oluwatobi Paul'),
('Iwuanyanwu Chimanma Marycynthia'),
('Adedokun Jelil Lanre'),
('Andrew Okoroafor'),
('Falujo Margaret'),
('Akinoso Daniel'),
('Thomas Moses Moko'),
('Mercy Chizoba Nnajieme'),
('Akinyemi Irorunoluwa Daniel'),
('Tayo Akosile'),
('Michael Olatunji'),
('Ilori Dabira Emmanuel'),
('Egbonwon Daniel'),
('Gideon Chioma Success'),
('Elizabeth Ogbewele'),
('Arowoogun Adekunle Victor'),
('Ms jamal Juliet'),
('Akintunde Imoleayo Victoria'),
('Giami Fortune Chienweatu'),
('Nwose Lovette Chidimma'),
('Benson Egwu'),
('Okolie Chinetugo Victoria'),
('Desmond Josephat'),
('Akinoso Victor'),
('Benita Akubudike'),
('Yakubu Aisha Osheiza'),
('Tina obebeduo'),
('Blessing Efe'),
('Ajibade Deborah Jesudamilola'),
('Nzekwe Favour Ifunanya'),
('Morah Emmanuel Ifeanyi'),
('Anichukwueze Mary Jennifer')
ON CONFLICT (name) DO NOTHING;
