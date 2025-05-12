# Use Python 3.11 slim as the base image
FROM python:3.11-slim

# Set the working directory
WORKDIR /app

# Copy requirements and application files
COPY ./requirements.txt /app/requirements.txt
# Upgrade pip and install Python dependencies
RUN pip3 install --upgrade pip && pip install --no-cache-dir -r requirements.txt

COPY ./app.py /app/app.py
COPY ./static/ /app/static/
COPY ./templates/ /app/templates/

# Expose the port the Flask app runs on
EXPOSE 5000

# Command to run the Flask app when the container starts
CMD ["python", "app.py"]