# ==============================================================================
# ICBT Ride - Microsoft .NET Web Application Dockerfile
# ==============================================================================

FROM mcr.microsoft.com/dotnet/sdk:8.0 AS runtime
WORKDIR /app

# Copy application files
COPY . .

# Install official Microsoft dotnet-serve tool for high-performance static hosting
RUN dotnet tool install --global dotnet-serve
ENV PATH="${PATH}:/root/.dotnet/tools"

# Expose web application port
EXPOSE 8080

# Serve wwwroot folder on port 8080 (serves index.html which redirects to login.html)
CMD ["dotnet-serve", "-p", "8080", "-d", "wwwroot", "-a", "0.0.0.0"]
