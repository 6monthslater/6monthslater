import pycurl
import certifi
from io import BytesIO

def request_page(url: str) -> str:
    buffer = BytesIO()
    c = pycurl.Curl()
    c.setopt(pycurl.URL, url)
    c.setopt(pycurl.WRITEDATA, buffer)
    # HTTPS root certs for verification
    c.setopt(pycurl.CAINFO, certifi.where())

    c.setopt(pycurl.HTTPHEADER, [
        "accept-language: en-US,en;q=0.5",
        "accept-encoding: gzip, deflate, br",
        "accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
        "sec-ch-ua: \"Chromium\";v=\"110\", \"Not A(Brand\";v=\"24\", \"Google Chrome\";v=\"110\"",
        "sec-ch-ua-mobile: ?0",
        "sec-ch-ua-platform: \"Windows\"",
        "sec-fetch-dest: document",
        "sec-fetch-mode: navigate",
        "sec-fetch-site: none",
        "sec-fetch-user: ?1",
        "upgrade-insecure-requests: 1",
        "user-agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36"
    ])

    c.setopt(pycurl.ENCODING, 'gzip, deflate') 

    c.perform()

    body = buffer.getvalue()
    response_code = c.getinfo(pycurl.RESPONSE_CODE)
    c.close()
    
    if response_code != 200:
        raise Exception(f"Failed to fetch {url} with status code: {response_code}")


    return body.decode('utf-8')
