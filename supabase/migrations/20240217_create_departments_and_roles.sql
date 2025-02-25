-- Create departments table
CREATE TABLE departments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create roles table
CREATE TABLE roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  department_id UUID REFERENCES departments(id),
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Insert sample data
INSERT INTO departments (name) VALUES
  ('Nível Estratégico'),
  ('Inteligência'),
  ('Marketing');

INSERT INTO roles (department_id, name) VALUES
  ((SELECT id FROM departments WHERE name = 'Nível Estratégico'), 'CIO/COO (Head GROWTH BUSINESS)'),
  ((SELECT id FROM departments WHERE name = 'Inteligência'), 'Inteligência'),
  ((SELECT id FROM departments WHERE name = 'Inteligência'), 'Estrategista'),
  ((SELECT id FROM departments WHERE name = 'Marketing'), 'CMO (Head GROWTH MARKETING)'),
  ((SELECT id FROM departments WHERE name = 'Marketing'), 'Copywriter e Writer');

