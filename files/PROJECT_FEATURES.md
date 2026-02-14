System plan encompassing design and implementation on "Teacher-Tutor Generative AI using LangChain" project, structured into the three phases

 

Phase 1: Moodle LMS Integration and Familiarization (30%)

Objectives:

• Establish a learning environment for a teacher and students using Moodle.
• Introduce core LMS functionalities to ensure smooth interaction during later phases.
Design:

• Moodle Deployment:
o Deployment method (cloud based LMS hosting).
o Configure Moodle environment, including user accounts, course structures, and basic settings.
• Teacher Training:
o Create workshop/training materials covering Moodle's fundamental features:
▪ Course creation and management
▪ Content uploads (text, images, videos)
▪ Assessment tools (attendance, quizzes, assignments)
▪ Communication and collaboration features (forums, messaging)
• Student Onboarding:
o Manual enrollment for students.
o Provide orientation sessions on navigating Moodle, finding courses, and interacting with learning materials.
Implementation:

• Deployment: Set up the chosen Moodle instance. (DONE)
o http://lms.oprranhs.com/
• Training: Conduct teacher training, ensuring they can perform core tasks within the LMS. (IN PROGRESS)
• Onboarding: Guide students through the orientation process. (IN PROGRESS)
• Monitoring: Track usage & gather feedback from the teacher and students to identify areas for improvement. (TODO)
 

 

 

Phase 2: Generative AI Model Research & RAG App Development (10%)

Objectives:

• Identify suitable open-source LLMs for the project's requirements.
• Develop a proof-of-concept RAG app to demonstrate knowledge extraction and question answering.
Design:

• LLM Evaluation:
o Survey available open-source LLMs (consider factors like size, domain-specific training data, ease of fine-tuning, computational requirements).
o Shortlist candidates based on alignment with project goals and resource constraints.
• RAG App Architecture:
o Employ LangChain for LLM and vector store integration.
o Design a simple front-end for document upload and query input.
o Select a vector database (e.g., ChromaDB, Pinecone, Faiss) optimized for search efficiency.
Implementation:

• LLM Selection:
o Experiment with shortlisted models, assessing their performance on sample educational materials. (IN PROGRESS)
• RAG Development:
• Build the RAG pipeline using LangChain (document loader, text chunking, LLM for answer generation, vector store for retrieval). (TODO)
• Create the basic app interface. (TODO)
 

 

 

 

 

 

 

 

Phase 3: Moodle Plugin and API Integration (10%)

Objectives:

• Seamlessly integrate the generative AI functionality within the familiar Moodle environment.
• Provide intuitive interfaces for teachers and students to interact with the AI model.
Design:

• Moodle Plugin:
o Specify the desired features the plugin will provide within Moodle (e.g., dedicated chat interface, AI-powered question banks, content suggestion tool).
o Outline the data flow between the plugin and the backend AI application.
• API:
o Design a RESTful API to handle communication between the Moodle plugin and the generative AI app.
o Include endpoints for sending queries, receiving responses, and potentially tracking usage for insights.
Implementation:

• Plugin Development:
o Use Moodle's plugin development framework. (TODO)
o Build the user interface elements for the plugin. (TODO)
• API Development:
o Choose a suitable backend framework (e.g., Flask, Node.js). (TODO)
o Implement the API endpoints, ensuring security and authentication measures. (TODO)