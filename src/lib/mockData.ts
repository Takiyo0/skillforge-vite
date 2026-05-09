import { Server, BrainCircuit } from 'lucide-react';

export interface Module {
	id: string;
	type: 'video' | 'material' | 'project' | 'quiz';
	title: string;
	status: 'completed' | 'current' | 'locked';
	duration: string;
	xp: number;
	codeTemplate?: string;
}

export interface Course {
	id: string;
	title: string;
	tag: string;
	icon: typeof Server;
	color: 'blue' | 'emerald';
	progress: number;
	modules: Module[];
}

export const mockCourses: Course[] = [
	{
		id: 'backend',
		title: 'Backend Engineering',
		tag: 'Main Campaign',
		icon: Server,
		color: 'blue',
		progress: 68,
		modules: [
			{ id: 'b1', type: 'video', title: '1. Introduction to APIs', status: 'completed', duration: '15 mins', xp: 50 },
			{ id: 'b2', type: 'material', title: '2. RESTful Architecture', status: 'completed', duration: '10 mins read', xp: 30 },
			{ id: 'b3', type: 'project', title: '3. Build a Simple Server', status: 'completed', duration: 'Code Arena', xp: 150, codeTemplate: `const http = require('http');\n\nconst server = http.createServer((req, res) => {\n  res.statusCode = 200;\n  res.setHeader('Content-Type', 'text/plain');\n  res.end('Hello World');\n});\n\nserver.listen(3000, () => {\n  console.log('Server running');\n});` },
			{ id: 'b4', type: 'video', title: '4. Authentication & JWT', status: 'current', duration: '22 mins', xp: 75 },
			{ id: 'b5', type: 'project', title: '5. Boss Battle: Auth Service', status: 'locked', duration: 'Boss Battle', xp: 500, codeTemplate: `const express = require('express');\nconst app = express();\n\n// TODO: Implement JWT Login\napp.post('/login', (req, res) => {\n  \n});\n\napp.listen(3000);` },
		]
	},
	{
		id: 'ai_ml',
		title: 'AI & Machine Learning',
		tag: 'Side Quest',
		icon: BrainCircuit,
		color: 'emerald',
		progress: 25,
		modules: [
			{ id: 'a1', type: 'video', title: '1. Introduction to Neural Networks', status: 'completed', duration: '20 mins', xp: 60 },
			{ id: 'a2', type: 'material', title: '2. Weights, Biases & Activation', status: 'completed', duration: '15 mins read', xp: 40 },
			{ id: 'a3', type: 'project', title: '3. Code a Perceptron', status: 'current', duration: 'Code Arena', xp: 200, codeTemplate: `class Perceptron {\n  constructor(learningRate = 0.1) {\n    this.weights = [];\n    this.lr = learningRate;\n  }\n  \n  // TODO: Implement prediction logic\n  predict(inputs) {\n    let sum = 0;\n    return sum > 0 ? 1 : 0;\n  }\n}\n\nconsole.log("Ready to train AI!");` },
			{ id: 'a4', type: 'quiz', title: '4. Gradient Descent Basics', status: 'locked', duration: '10 Questions', xp: 100 },
			{ id: 'a5', type: 'project', title: '5. Boss Battle: Image Classifier', status: 'locked', duration: 'Boss Battle', xp: 800, codeTemplate: `// Import TensorFlow.js or similar\n// Build your CNN here` },
		]
	}
];

export const users = {
	student: { name: 'Shiroko', role: 'Student', xp: 2450, level: 12, nextLevelXp: 3000, streak: 14, title: 'Novice Coder' },
	instructor: { name: 'Hoshino', role: 'Instructor', courses: 4 },
	admin: { name: 'Yuuka', role: 'Admin', systemHealth: 'Optimal' }
};
