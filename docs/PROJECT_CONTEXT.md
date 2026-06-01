# BOOKMIND - PROJECT CONTEXT

## PRODUCT NAME

BookMind

---

## TAGLINE

Learn Any Book In The Time You Have

---

# PRODUCT VISION

BookMind transforms books into structured knowledge experiences.

This is NOT:

* a PDF reader
* a note-taking application
* a file manager
* a PDF summarizer

This IS:

A knowledge platform that helps users understand books at different depths without losing important concepts, stories, examples, frameworks, and chapter relationships.

---

# CORE PROMISE

A user uploads a book.

The platform converts the book into a Knowledge Package.

The user can learn the book in:

⚡ 1 Minute

🚀 10 Minutes

🧠 30 Minutes

📚 Full Depth

---

# PRIMARY USER PROBLEM

Books are valuable but require significant time.

Traditional summaries lose:

* context
* examples
* stories
* chapter relationships
* mental models

Users want:

Fast Understanding

without

Information Loss

---

# USER JOURNEY

Home
↓
Upload PDF
↓
Processing
↓
Library
↓
Book Dashboard
↓
Choose Learning Depth

1 Minute
10 Minutes
30 Minutes
Full Depth

↓
Explore

Overview
Journey
Contents
Chapters
Concepts
Examples
Actions
PDF

---

# DESIGN PHILOSOPHY

The application should feel like:

Netflix for Knowledge

MasterClass for Learning

Kindle for Reading

Duolingo for Progress

The application should NOT feel like:

Google Drive

Dropbox

Obsidian

Admin Dashboard

File Explorer

---

# EXISTING SCREENS

Generated using Google Stitch.

Current screens include:

* Home
* Library
* Book Dashboard
* Learning Journey
* Core Concepts
* Reading Mode

These screens are the design source of truth.

Preserve the visual design.

---

# MAIN FEATURES

## 1. HOME

Purpose:

Introduce BookMind.

Main CTA:

Upload Book

Sections:

* Continue Learning
* Recently Added
* Recommended Books

---

## 2. LIBRARY

Purpose:

Display all uploaded books.

Book Card:

* Cover
* Title
* Author
* Reading Time
* Knowledge Ready Status

The Library should feel like a streaming platform.

---

## 3. BOOK DASHBOARD

Most important page.

Hero Section:

Learn This Book

⚡ Learn in 1 Minute

🚀 Learn in 10 Minutes

🧠 Learn in 30 Minutes

📚 Full Depth

Below:

* Overview
* Journey
* Contents
* Chapters
* Concepts
* Examples
* Actions
* PDF

---

## 4. LEARNING MODES

### Learn In 1 Minute

Contains:

* Book Thesis
* Top Lessons
* Who Should Read It

---

### Learn In 10 Minutes

Contains:

* Core Framework
* Main Concepts
* Key Examples

---

### Learn In 30 Minutes

Contains:

* Detailed Understanding
* Mental Models
* Important Stories
* Action Items

---

### Full Depth

Contains:

All generated knowledge.

---

## 5. OVERVIEW

Contains:

* Book Summary
* Framework
* Main Lessons
* Learning Modes

---

## 6. JOURNEY

Visual representation of idea progression.

Example:

Identity
↓
Habits
↓
Systems
↓
Results

Interactive nodes.

Users should understand how the author's ideas connect.

---

## 7. CONTENTS

Actual book structure.

Example:

Part 1

Chapter 1

Chapter 2

Chapter 3

Must preserve original book hierarchy.

---

## 8. CHAPTERS

Each chapter contains:

* Summary
* Key Ideas
* Examples
* Stories
* Quotes
* Action Items

---

## 9. CONCEPTS

Concept-first learning.

Examples:

* Habit Loop
* Identity-Based Habits
* Environment Design
* Compounding

Concepts should be presented as cards.

---

## 10. EXAMPLES

Preserve examples from the book.

For each concept:

* Concept
* Author Example
* Story
* Case Study
* Modern Example
* Personal Application

Examples are a key differentiator.

Do not lose examples.

---

## 11. ACTIONS

Practical implementation.

Sections:

Tomorrow

This Week

This Month

Purpose:

Turn knowledge into execution.

---

## 12. PDF VIEW

Display original PDF.

Allow users to read the source material.

Future versions may support page navigation from concepts.

---

# STORAGE STRATEGY

No database in MVP.

Use local file storage.

Structure:

storage/

books/

knowledge/

library.json

Example:

storage/

books/
atomic-habits.pdf

knowledge/

atomic-habits/

overview.md

concepts.md

examples.md

actions.md

chapter-01.md

chapter-02.md

---

# KNOWLEDGE PACKAGE

Each uploaded book generates:

Book Metadata

1 Minute Learning

10 Minute Learning

30 Minute Learning

Overview

Journey

Contents

Chapters

Concepts

Examples

Actions

Markdown Files

Store permanently.

Do not regenerate every time.

---

# TECHNOLOGY STACK

Frontend:

Next.js

TypeScript

Tailwind CSS

shadcn/ui

PDF:

pdf-parse

pdf.js

Storage:

Markdown Files

JSON Metadata

AI:

OpenAI API

---

# DEVELOPMENT PRIORITY

Priority 1:

Working UI

Priority 2:

PDF Upload

Priority 3:

PDF Text Extraction

Priority 4:

Knowledge Package Generation

Priority 5:

Markdown Storage

Priority 6:

Display Generated Knowledge

---

# EXCLUDED FEATURES

Do not build:

* RAG
* Vector Database
* Agents
* Authentication
* Payments
* Teams
* Mobile App
* MCP Features
* Knowledge Graph

These are future enhancements.

Focus on building the best book learning experience possible.

---

# SUCCESS CRITERIA

A user uploads a book.

The system generates a Knowledge Package.

The user can:

* Learn in 1 minute
* Learn in 10 minutes
* Learn in 30 minutes
* Explore concepts
* Explore examples
* Explore chapters
* Read original content

The experience should feel significantly better than reading a PDF or a generic AI summary.
