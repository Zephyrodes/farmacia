FROM python:3.10

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY wait-for-it.sh /usr/local/bin/wait-for-it.sh
RUN chmod +x /usr/local/bin/wait-for-it.sh

COPY . .

CMD ["wait-for-it.sh", "db:3306", "--timeout=330", "--", "uvicorn", "farmacia:app", "--host", "0.0.0.0", "--port", "8000"]