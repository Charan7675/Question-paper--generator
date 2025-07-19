const express = require('express');
const multer = require('multer');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const dotenv = require('dotenv');
const cors = require('cors');

dotenv.config();
const app = express();
const port = 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Set up multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Bloom's Taxonomy Levels Mapping with Weightage
const bloomLevels = [
    { 
        level: 'L1', 
        code: 'Remember', 
        description: 'Recall basic facts, terms, concepts',
        weightage: 0.1 // Lowest complexity
    },
    { 
        level: 'L2', 
        code: 'Understand', 
        description: 'Explain ideas, interpret information',
        weightage: 0.2
    },
    { 
        level: 'L3', 
        code: 'Apply', 
        description: 'Use information in new situations',
        weightage: 0.3
    },
    { 
        level: 'L4', 
        code: 'Analyze', 
        description: 'Draw connections, distinguish components',
        weightage: 0.4
    },
    { 
        level: 'L5', 
        code: 'Evaluate', 
        description: 'Justify, critique, make judgments',
        weightage: 0.5
    },
    { 
        level: 'L6', 
        code: 'Create', 
        description: 'Generate new ideas, design solutions',
        weightage: 0.6 // Highest complexity
    }
];

// Determine number of questions based on marks
function determineQuestionCount(marks) {
    switch(marks) {
        case 25: return 2;
        case 50: return 3;
        case 100: return 5;
        default: return 2;
    }
}

// Assign Bloom's Taxonomy Levels progressively
function assignBloomLevel(questionIndex, subPartIndex) {
    const baseIndex = (questionIndex * 2) + subPartIndex;
    const level = bloomLevels[baseIndex % bloomLevels.length];
    return {
        bloomLevel: level.level,
        bloomLevelDescription: level.code,
        bloomWeightage: level.weightage
    };
}

// Allocate marks based on Bloom's Taxonomy weightage
function allocateMarks(totalMarks, numQuestions) {
    const questionMarks = totalMarks / numQuestions;
    const subQuestionsPerQuestion = 4; // 2 sub-questions in part a and 2 in part b
    const baseMarksPerSubQuestion = questionMarks / subQuestionsPerQuestion;

    return bloomLevels.map((level, index) => ({
        ...level,
        adjustedMarks: baseMarksPerSubQuestion * level.weightage
    }));
}

// API endpoint to handle image upload and question generation
app.post('/generate-questions', upload.single('image'), async (req, res) => {
    const apiKey = process.env.GOOGLE_API_KEY;
    const marks = parseInt(req.body.maxMarks) || 20;
    const numQuestions = determineQuestionCount(marks);

    if (!req.file) {
        return res.status(400).json({ error: 'No image file uploaded.' });
    }

    // Allocate marks based on Bloom's Taxonomy
    const marksAllocation = allocateMarks(marks, numQuestions);

    const base64Image = req.file.buffer.toString('base64');
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `Generate ${numQuestions} comprehensive, academically rigorous questions based on the image content.
                   Ensure questions are:
                   - Precise and clear
                   - Directly related to the image
                   - Avoid using words like 'module', 'textbook', or referencing specific learning materials
                   - Demonstrate deep analytical thinking

                   For each question, create two main parts (a and b).
                   Each part should have two sub-questions.
                   
                   Format the output as:
                   Q1:
                   a1) First sub-question of part a
                   a2) Second sub-question of part a
                   b1) First sub-question of part b
                   b2) Second sub-question of part b

                   Focus on extracting and analyzing key information from the image.`;

    try {
        const result = await model.generateContent({
            contents: [{
                role: "user",
                parts: [
                    { text: prompt },
                    { inlineData: { mimeType: req.file.mimetype, data: base64Image } }
                ]
            }]
        });

        const generatedQuestions = result.response.text();
        const questionBlocks = generatedQuestions.split('Q').filter(q => q.trim() !== '');

        const questions = [];

        questionBlocks.forEach((block, questionIndex) => {
            const subQuestions = block.split('\n').filter(q => q.trim() !== '');
            
            const questionParts = {
                a: subQuestions.filter(q => q.startsWith('a')),
                b: subQuestions.filter(q => q.startsWith('b'))
            };

            // Dynamically generate course code based on module/question index
            const currentCourseCode = `CO${questionIndex + 1}`;

            const questionPart = {
                a: questionParts.a.map((subQ, subIndex) => {
                    const bloomData = assignBloomLevel(questionIndex, 0);
                    const marks = marksAllocation.find(m => m.level === bloomData.bloomLevel).adjustedMarks;
                    return {
                        questionNumber: questionIndex + 1,
                        questionPart: 'a',
                        subPart: subIndex + 1,
                        questionText: subQ.replace(/^a\d*\)\s*/, '').trim(),
                        marks: Number(marks.toFixed(2)),
                        ...bloomData,
                        course: currentCourseCode
                    };
                }),
                b: questionParts.b.map((subQ, subIndex) => {
                    const bloomData = assignBloomLevel(questionIndex, 1);
                    const marks = marksAllocation.find(m => m.level === bloomData.bloomLevel).adjustedMarks;
                    return {
                        questionNumber: questionIndex + 1,
                        questionPart: 'b',
                        subPart: subIndex + 1,
                        questionText: subQ.replace(/^b\d*\)\s*/, '').trim(),
                        marks: Number(marks.toFixed(2)),
                        ...bloomData,
                        course: currentCourseCode
                    };
                })
            };

            questions.push(...questionPart.a, ...questionPart.b);
        });

        // Adjust marks to ensure total matches exactly
        const totalCurrentMarks = questions.reduce((sum, q) => sum + q.marks, 0);
        if (totalCurrentMarks !== marks) {
            const difference = marks - totalCurrentMarks;
            questions[0].marks += Number(difference.toFixed(2));
        }

        res.json({
            questions: questions,
            totalQuestions: numQuestions,
            marksRequested: marks,
            totalMarks: marks,
            marksAllocation: marksAllocation
        });
    } catch (error) {
        console.error('Error generating questions:', error);
        res.status(500).json({ error: 'Failed to generate questions.' });
    }
});

// Start the server
app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});
