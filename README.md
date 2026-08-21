# AI Cloud Cost & Security Advisor ☁️🤖

An AI-powered cloud optimization and security platform that helps organizations monitor cloud infrastructure, identify security risks, analyze cloud costs, and receive intelligent recommendations for improving cloud efficiency.

## 🌐 Live Demo 

**Frontend:** https://ai-cloud-cost-security-advisor.vercel.app

**Backend API:** https://ai-cloud-cost-security-advisor-1.onrender.com


## 🚀 Key Features

* 🔐 Secure user authentication and organization-based access
* ☁️ Cloud infrastructure and resource monitoring
* 💰 Cloud cost analysis and optimization recommendations
* 🛡️ Security risk detection and security recommendations
* 🤖 AI-powered insights for cloud cost and security optimization
* 📊 Interactive analytics and monitoring dashboard
* 🐳 Docker-based application architecture
* 🔄 CI/CD-ready deployment workflow
* 📈 Real-time system and cloud metrics visualization
* 👥 Organization/member management with role-based access
* 🌐 Production deployment with frontend and backend separation

## 🛠️ Tech Stack

| Category       | Technologies                                  |
| -------------- | --------------------------------------------- |
| Frontend       | Next.js, React, TypeScript, Tailwind CSS      |
| Backend        | Node.js, TypeScript, REST API                 |
| Database       | PostgreSQL, Prisma ORM                        |
| Caching        | Redis                                         |
| Cloud & DevOps | AWS, Docker, CI/CD, Render, Vercel            |
| Security       | JWT Authentication, Role-Based Access Control |
| AI             | AI-powered cloud cost and security analysis   |

## 🎯 Project Objective

The goal of this project is to build a practical cloud intelligence platform that combines **Artificial Intelligence, Cloud Computing, Security, and DevOps** to help users make better infrastructure and cost-management decisions.

## 🏗️ Architecture

```text
                    ┌──────────────────────┐
                    │       User           │
                    └──────────┬───────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │   Next.js Frontend   │
                    │   React + TypeScript  │
                    └──────────┬───────────┘
                               │ REST API
                               ▼
                    ┌──────────────────────┐
                    │   Node.js Backend    │
                    │   TypeScript + API   │
                    └───────┬───────┬──────┘
                            │       │
                    ┌───────▼───┐ ┌─▼────────┐
                    │ PostgreSQL│ │  Redis   │
                    │  + Prisma │ │  Cache   │
                    └───────────┘ └──────────┘
                            │
                            ▼
                    ┌──────────────────────┐
                    │ Cloud / AI Analysis  │
                    │ Cost + Security      │
                    └──────────────────────┘
```

## 🔐 Security

The application includes:

* JWT-based authentication
* Role-based access control
* Organization-level authorization
* Secure API communication
* Protected user and organization resources

## 🐳 Deployment

The application is designed using a separate frontend/backend architecture.

* **Frontend:** Vercel
* **Backend:** Render
* **Database:** PostgreSQL
* **Caching:** Redis
* **Containerization:** Docker
* **Version Control:** Git & GitHub

## 📂 Project Structure

```text
AI-Cloud-Cost-Security-Advisor/
│
├── backend/
│   ├── src/
│   ├── prisma/
│   ├── package.json
│   └── ...
│
├── frontend/
│   ├── app/
│   ├── components/
│   ├── package.json
│   └── ...
│
├── Dockerfile
├── DEPLOYMENT.md
└── README.md
```

## 👨‍💻 Developed By

**Ankush Patial**

B.Tech Computer Science & Engineering | Cloud Computing
Lovely Professional University

* GitHub: https://github.com/Ankushpatial82
* LinkedIn: http://linkedin.com/in/ankushpatial

## ⭐ Project

If you find this project useful, consider giving the repository a ⭐ on GitHub.
