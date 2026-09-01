================================================================================
                    ICBT RIDE - CARPOOLING WEB APPLICATION
                         HOW TO RUN & USER GUIDELINE
================================================================================

[STEP 1: PREREQUISITES]
--------------------------------------------------------------------------------
1. Make sure Docker Desktop is installed and RUNNING on your computer.
2. If Docker Desktop is not running, open Docker Desktop first.


[STEP 2: NAVIGATE TO PROJECT FOLDER]
--------------------------------------------------------------------------------
1. Open File Explorer.
2. Go inside the  project folder where the "Dockerfile" and "docker-compose.yml" 
   files are located:
   
   PATH: 
   Icbt_Ride_carpooling_web_app-main -> icbt ride -> icbt ride
  example - (E:\Projects\Icbt_Ride_carpooling_web_app-main\icbt ride\)

[STEP 3: OPEN TERMINAL / COMMAND PROMPT]
--------------------------------------------------------------------------------
1. Inside that folder ("icbt ride/icbt ride"), click on the address bar at 
   the top of File Explorer.
2. Type "cmd" or "powershell" and press ENTER.
   (OR Right-click in an empty space and choose "Open in Terminal" / "Open Git Bash here").


[STEP 4: RUN DOCKER CONTAINER]
--------------------------------------------------------------------------------
Type the following command in your terminal and press ENTER:

   docker compose up -d --build

* Wait 10-20 seconds while Docker automatically builds and starts the web application.


[STEP 5: OPEN IN WEB BROWSER]
--------------------------------------------------------------------------------
Open your web browser (Chrome, Edge, Brave, etc.) and go to:

   👉 http://localhost:8080   == Main login screen

* This will immediately load the MAIN LOGIN SCREEN!


================================================================================
                         ACCESS LINKS & LOGIN CREDENTIALS
================================================================================

1. MAIN LOGIN SCREEN (Passenger / Driver / Vehicle Owner):
   --------------------------------------------------------
   URL: http://localhost:8080
   
   * Select your role tab on the screen:
     - PASSENGER LOGIN:
       Email:    student@icbt.lk
       Password: student123
       
     - DRIVER LOGIN:
       Email:    driver@icbt.lk
       Password: driver123
       
     - VEHICLE OWNER LOGIN:
       Email:    owner@icbt.lk
       Password: owner123


2. ADMIN PORTAL (Separate Direct Link):
   --------------------------------------------------------
   URL: 👉 http://localhost:8080/admin-dashboard/admin-login.html
   
   - ADMIN LOGIN CREDENTIALS:
     Email:    admin@icbt.lk
     Password: admin123


================================================================================
                         HOW TO STOP THE APPLICATION
================================================================================
When you are done testing, you can stop the container by running:

   docker compose down

================================================================================
                      Thank you for using ICBT Ride!
================================================================================
