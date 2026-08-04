import type { Database } from "sql.js";
import { matchesSolution, runQuery, type QueryResult } from "./sqlEngine";

export const SCHEMA_SETUP: string[] = [
  `CREATE TABLE students (
     id INTEGER PRIMARY KEY,
     name TEXT,
     department TEXT,
     score INTEGER
   );`,
  `INSERT INTO students (id, name, department, score) VALUES
     (1, 'Aditi', 'CSE', 92),
     (2, 'Rahul', 'ECE', 78),
     (3, 'Meera', 'CSE', 85),
     (4, 'Sanjay', 'MECH', 64),
     (5, 'Priya', 'CSE', 74),
     (6, 'Karan', 'ECE', 90),
     (7, 'Divya', 'MECH', 55),
     (8, 'Farah', 'CSE', 88);`,
  `CREATE TABLE courses (
     id INTEGER PRIMARY KEY,
     title TEXT,
     credits INTEGER
   );`,
  `INSERT INTO courses (id, title, credits) VALUES
     (1, 'Data Structures', 4),
     (2, 'Operating Systems', 3),
     (3, 'Computer Networks', 3),
     (4, 'Digital Circuits', 4);`,
  `CREATE TABLE enrollments (
     student_id INTEGER,
     course_id INTEGER
   );`,
  `INSERT INTO enrollments (student_id, course_id) VALUES
     (1, 1), (1, 2), (2, 3), (3, 1), (3, 3), (4, 4), (5, 1), (6, 3), (6, 2), (8, 1);`,
];

export const SCHEMA_INFO = [
  { table: "students", columns: ["id", "name", "department", "score"] },
  { table: "courses", columns: ["id", "title", "credits"] },
  { table: "enrollments", columns: ["student_id", "course_id"] },
];

export interface SqlLevel {
  id: string;
  title: string;
  goal: string;
  hint: string;
  xp: number;
  check: (db: Database, lastResult: QueryResult | null) => boolean;
}

export const SQL_LEVELS: SqlLevel[] = [
  {
    id: "select-all",
    title: "Select everything",
    goal: "See every student in the students table.",
    hint: "SELECT * FROM students;",
    xp: 10,
    check: (db, last) => matchesSolution(db, "SELECT * FROM students;", last, false),
  },
  {
    id: "where-filter",
    title: "Filter with WHERE",
    goal: "Find every student in the CSE department.",
    hint: "SELECT * FROM students WHERE department = 'CSE';",
    xp: 15,
    check: (db, last) => matchesSolution(db, "SELECT * FROM students WHERE department = 'CSE';", last, false),
  },
  {
    id: "order-by",
    title: "Sort with ORDER BY",
    goal: "List every student's name and score, highest score first.",
    hint: "SELECT name, score FROM students ORDER BY score DESC;",
    xp: 15,
    check: (db, last) =>
      matchesSolution(db, "SELECT name, score FROM students ORDER BY score DESC;", last, true),
  },
  {
    id: "limit",
    title: "Limit the results",
    goal: "Find the top 3 scoring students (name and score only).",
    hint: "SELECT name, score FROM students ORDER BY score DESC LIMIT 3;",
    xp: 15,
    check: (db, last) =>
      matchesSolution(db, "SELECT name, score FROM students ORDER BY score DESC LIMIT 3;", last, true),
  },
  {
    id: "group-by",
    title: "Count with GROUP BY",
    goal: "Count how many students are in each department.",
    hint: "SELECT department, COUNT(*) FROM students GROUP BY department;",
    xp: 20,
    check: (db, last) =>
      matchesSolution(db, "SELECT department, COUNT(*) FROM students GROUP BY department;", last, false),
  },
  {
    id: "having",
    title: "Filter groups with HAVING",
    goal: "Find departments whose average student score is above 80.",
    hint: "SELECT department, AVG(score) FROM students GROUP BY department HAVING AVG(score) > 80;",
    xp: 25,
    check: (db, last) =>
      matchesSolution(
        db,
        "SELECT department, AVG(score) FROM students GROUP BY department HAVING AVG(score) > 80;",
        last,
        false,
      ),
  },
  {
    id: "join",
    title: "Join two tables",
    goal: "List each student's name alongside the title of every course they're enrolled in.",
    hint:
      "SELECT students.name, courses.title FROM enrollments " +
      "JOIN students ON enrollments.student_id = students.id " +
      "JOIN courses ON enrollments.course_id = courses.id;",
    xp: 25,
    check: (db, last) =>
      matchesSolution(
        db,
        "SELECT students.name, courses.title FROM enrollments " +
          "JOIN students ON enrollments.student_id = students.id " +
          "JOIN courses ON enrollments.course_id = courses.id;",
        last,
        false,
      ),
  },
  {
    id: "insert",
    title: "Insert a new row",
    goal: "Add a new student named 'Vikram' in the ECE department with a score of 70.",
    hint: "INSERT INTO students (id, name, department, score) VALUES (9, 'Vikram', 'ECE', 70);",
    xp: 20,
    check: (db) => {
      const result = runQuery(db, "SELECT * FROM students WHERE name = 'Vikram' AND department = 'ECE' AND score = 70;");
      return !result.error && result.rows.length >= 1;
    },
  },
];
