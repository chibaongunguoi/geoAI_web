import urllib.request
import os

def download_tile():
    os.makedirs("geoai_data", exist_ok=True)
    url = "http://storage.googleapis.com/global-surface-water/downloads2021/occurrence/occurrence_100E_20Nv1_4_2021.tif"
    dest = "geoai_data/occurrence_100E_20Nv1_4_2021.tif"
    
    if os.path.exists(dest):
        print(f"File {dest} already exists.")
        return
        
    print(f"Downloading {url} ...")
    urllib.request.urlretrieve(url, dest)
    print("Download complete.")

if __name__ == "__main__":
    download_tile()
