# Project Setup Guide

# Requirements 
    * Python 3.11+
    * pip
    * Node.js

# 1. Clone the Repository 
    git clone <repository url>
    cd groupProj

## 2. Backend Setup
    * Navigate to backend folder:
        cd optionsAndProperty 

### Create virtual environment(optional)
    * python -m venv venv

### Activate the virtual environment (optional)
    Mac/Linux:
    source venv/bin/activate

    Windows:
    venv\Scripts\activate


### Install dependencies 
    pip install -r requirements.txt



### Create database 
    python manage.py migrate

### Load project data
    python manage.py load_district_data

### Run backend server
    python manage.py runserver


### Frontend SetUp 

Open a new terminal 

cd frontend 

### Install dependencies 
npm install 

### Start frontend 
npm run dev