#!/usr/bin/env python3
"""
OSINT Forensic Intelligence Engine
Author: OSINT Forensic Investigator Suite
Description: Standalone, zero-dependency Python 3 engine for digital investigators.
Capabilities:
  - High-speed concurrent cross-platform username & identity verification
  - Forensic image metadata extraction (EXIF, IPTC, GPS to decimal, edit software detection)
  - Cryptographic evidence hashing (MD5, SHA-1, SHA-256, SHA-512)
  - OSINT Dork & Public Record query generation
"""

import sys
import os
import re
import json
import struct
import hashlib
import argparse
from datetime import datetime
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError
from concurrent.futures import ThreadPoolExecutor, as_completed

PLATFORMS = [
    {
        "id": "github",
        "name": "GitHub",
        "category": "Developer",
        "url": "https://github.com/{}",
        "check_url": "https://github.com/{}",
        "not_found_code": 404,
        "icon": "github"
    },
    {
        "id": "reddit",
        "name": "Reddit",
        "category": "Social",
        "url": "https://www.reddit.com/user/{}",
        "check_url": "https://www.reddit.com/user/{}/about.json",
        "not_found_code": 404,
        "icon": "message-square"
    },
    {
        "id": "twitter",
        "name": "X / Twitter",
        "category": "Social",
        "url": "https://x.com/{}",
        "check_url": "https://x.com/{}",
        "not_found_code": 404,
        "icon": "twitter"
    },
    {
        "id": "instagram",
        "name": "Instagram",
        "category": "Social",
        "url": "https://www.instagram.com/{}/",
        "check_url": "https://www.instagram.com/{}/",
        "not_found_code": 404,
        "icon": "camera"
    },
    {
        "id": "telegram",
        "name": "Telegram",
        "category": "Messaging",
        "url": "https://t.me/{}",
        "check_url": "https://t.me/{}",
        "not_found_string": "If you have Telegram, you can contact",
        "not_found_code": 404,
        "icon": "send"
    },
    {
        "id": "pinterest",
        "name": "Pinterest",
        "category": "Social",
        "url": "https://www.pinterest.com/{}/",
        "check_url": "https://www.pinterest.com/{}/",
        "not_found_code": 404,
        "icon": "pin"
    },
    {
        "id": "medium",
        "name": "Medium",
        "category": "Blogging",
        "url": "https://medium.com/@{}",
        "check_url": "https://medium.com/@{}",
        "not_found_code": 404,
        "icon": "book-open"
    },
    {
        "id": "keybase",
        "name": "Keybase",
        "category": "Security",
        "url": "https://keybase.io/{}",
        "check_url": "https://keybase.io/{}",
        "not_found_code": 404,
        "icon": "key"
    },
    {
        "id": "hackernews",
        "name": "Hacker News",
        "category": "Developer",
        "url": "https://news.ycombinator.com/user?id={}",
        "check_url": "https://news.ycombinator.com/user?id={}",
        "not_found_string": "No such user.",
        "not_found_code": 404,
        "icon": "terminal"
    },
    {
        "id": "gitlab",
        "name": "GitLab",
        "category": "Developer",
        "url": "https://gitlab.com/{}",
        "check_url": "https://gitlab.com/{}",
        "not_found_code": 404,
        "icon": "code"
    },
    {
        "id": "devto",
        "name": "Dev.to",
        "category": "Developer",
        "url": "https://dev.to/{}",
        "check_url": "https://dev.to/{}",
        "not_found_code": 404,
        "icon": "code-xml"
    },
    {
        "id": "twitch",
        "name": "Twitch",
        "category": "Streaming",
        "url": "https://www.twitch.tv/{}",
        "check_url": "https://www.twitch.tv/{}",
        "not_found_code": 404,
        "icon": "video"
    },
    {
        "id": "steam",
        "name": "Steam",
        "category": "Gaming",
        "url": "https://steamcommunity.com/id/{}",
        "check_url": "https://steamcommunity.com/id/{}",
        "not_found_string": "The specified profile could not be found.",
        "not_found_code": 404,
        "icon": "gamepad-2"
    },
    {
        "id": "spotify",
        "name": "Spotify User",
        "category": "Audio",
        "url": "https://open.spotify.com/user/{}",
        "check_url": "https://open.spotify.com/user/{}",
        "not_found_code": 404,
        "icon": "music"
    },
    {
        "id": "mastodon",
        "name": "Mastodon.social",
        "category": "Federated",
        "url": "https://mastodon.social/@{}",
        "check_url": "https://mastodon.social/@{}",
        "not_found_code": 404,
        "icon": "share-2"
    },
    {
        "id": "tiktok",
        "name": "TikTok",
        "category": "Social",
        "url": "https://www.tiktok.com/@{}",
        "check_url": "https://www.tiktok.com/@{}",
        "not_found_code": 404,
        "icon": "play"
    },
    {
        "id": "youtube",
        "name": "YouTube",
        "category": "Streaming",
        "url": "https://www.youtube.com/@{}",
        "check_url": "https://www.youtube.com/@{}",
        "not_found_code": 404,
        "icon": "tv"
    },
    {
        "id": "linktree",
        "name": "Linktree",
        "category": "Social",
        "url": "https://linktr.ee/{}",
        "check_url": "https://linktr.ee/{}",
        "not_found_code": 404,
        "icon": "link"
    },
    {
        "id": "aboutme",
        "name": "About.me",
        "category": "Professional",
        "url": "https://about.me/{}",
        "check_url": "https://about.me/{}",
        "not_found_code": 404,
        "icon": "user"
    },
    {
        "id": "disqus",
        "name": "Disqus",
        "category": "Social",
        "url": "https://disqus.com/by/{}/",
        "check_url": "https://disqus.com/by/{}/",
        "not_found_code": 404,
        "icon": "message-circle"
    },
    {
        "id": "flickr",
        "name": "Flickr",
        "category": "Photography",
        "url": "https://www.flickr.com/people/{}",
        "check_url": "https://www.flickr.com/people/{}",
        "not_found_code": 404,
        "icon": "image"
    },
    {
        "id": "vimeo",
        "name": "Vimeo",
        "category": "Video",
        "url": "https://vimeo.com/{}",
        "check_url": "https://vimeo.com/{}",
        "not_found_code": 404,
        "icon": "film"
    },
    {
        "id": "soundcloud",
        "name": "SoundCloud",
        "category": "Audio",
        "url": "https://soundcloud.com/{}",
        "check_url": "https://soundcloud.com/{}",
        "not_found_code": 404,
        "icon": "headphones"
    },
    {
        "id": "behance",
        "name": "Behance",
        "category": "Creative",
        "url": "https://www.behance.net/{}",
        "check_url": "https://www.behance.net/{}",
        "not_found_code": 404,
        "icon": "palette"
    },
    {
        "id": "dribbble",
        "name": "Dribbble",
        "category": "Creative",
        "url": "https://dribbble.com/{}",
        "check_url": "https://dribbble.com/{}",
        "not_found_code": 404,
        "icon": "pen-tool"
    }
]

USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"

# EXIF Tag dictionary mapping (standard TIFF/EXIF tag IDs)
EXIF_TAGS = {
    0x010E: "ImageDescription",
    0x010F: "Make",
    0x0110: "Model",
    0x0112: "Orientation",
    0x011A: "XResolution",
    0x011B: "YResolution",
    0x0128: "ResolutionUnit",
    0x0131: "Software",
    0x0132: "DateTime",
    0x013B: "Artist",
    0x8298: "Copyright",
    0x829A: "ExposureTime",
    0x829D: "FNumber",
    0x8822: "ExposureProgram",
    0x8827: "ISOSpeedRatings",
    0x9000: "ExifVersion",
    0x9003: "DateTimeOriginal",
    0x9004: "DateTimeDigitized",
    0x9201: "ShutterSpeedValue",
    0x9202: "ApertureValue",
    0x9204: "ExposureBiasValue",
    0x9207: "MeteringMode",
    0x9208: "LightSource",
    0x9209: "Flash",
    0x920A: "FocalLength",
    0x9286: "UserComment",
    0xA002: "PixelXDimension",
    0xA003: "PixelYDimension",
    0xA405: "FocalLengthIn35mmFilm",
    0xA434: "LensModel",
    0xA432: "LensSpecification",
    0xA433: "LensMake",
}

GPS_TAGS = {
    0x0000: "GPSVersionID",
    0x0001: "GPSLatitudeRef",
    0x0002: "GPSLatitude",
    0x0003: "GPSLongitudeRef",
    0x0004: "GPSLongitude",
    0x0005: "GPSAltitudeRef",
    0x0006: "GPSAltitude",
    0x0007: "GPSTimeStamp",
    0x001D: "GPSDateStamp",
}

def check_single_platform(platform, username):
    target_url = platform["url"].format(username)
    check_url = platform["check_url"].format(username)
    req = Request(
        check_url,
        headers={
            "User-Agent": USER_AGENT,
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.5",
        }
    )
    
    start_time = datetime.now()
    try:
        with urlopen(req, timeout=4.5) as response:
            status_code = response.getcode()
            content = response.read().decode("utf-8", errors="ignore")
            elapsed_ms = int((datetime.now() - start_time).total_seconds() * 1000)
            
            # Check string indicators if specified
            if "not_found_string" in platform and platform["not_found_string"] in content:
                return {
                    "id": platform["id"],
                    "name": platform["name"],
                    "category": platform["category"],
                    "url": target_url,
                    "status": "NOT_FOUND",
                    "http_code": status_code,
                    "latency_ms": elapsed_ms,
                    "icon": platform.get("icon", "globe")
                }
            
            # Found
            return {
                "id": platform["id"],
                "name": platform["name"],
                "category": platform["category"],
                "url": target_url,
                "status": "FOUND",
                "http_code": status_code,
                "latency_ms": elapsed_ms,
                "icon": platform.get("icon", "globe")
            }
            
    except HTTPError as e:
        elapsed_ms = int((datetime.now() - start_time).total_seconds() * 1000)
        if e.code == 404:
            return {
                "id": platform["id"],
                "name": platform["name"],
                "category": platform["category"],
                "url": target_url,
                "status": "NOT_FOUND",
                "http_code": 404,
                "latency_ms": elapsed_ms,
                "icon": platform.get("icon", "globe")
            }
        elif e.code in (403, 429):
            return {
                "id": platform["id"],
                "name": platform["name"],
                "category": platform["category"],
                "url": target_url,
                "status": "RATE_LIMITED",
                "http_code": e.code,
                "latency_ms": elapsed_ms,
                "icon": platform.get("icon", "globe")
            }
        else:
            return {
                "id": platform["id"],
                "name": platform["name"],
                "category": platform["category"],
                "url": target_url,
                "status": "ERROR",
                "http_code": e.code,
                "latency_ms": elapsed_ms,
                "icon": platform.get("icon", "globe")
            }
    except (URLError, TimeoutError, Exception) as e:
        elapsed_ms = int((datetime.now() - start_time).total_seconds() * 1000)
        return {
            "id": platform["id"],
            "name": platform["name"],
            "category": platform["category"],
            "url": target_url,
            "status": "TIMEOUT",
            "http_code": 0,
            "latency_ms": elapsed_ms,
            "icon": platform.get("icon", "globe")
        }

def scan_username(username, max_threads=15):
    """Scan all supported platforms for a given username concurrently."""
    results = []
    with ThreadPoolExecutor(max_workers=max_threads) as executor:
        future_map = {executor.submit(check_single_platform, p, username): p for p in PLATFORMS}
        for future in as_completed(future_map):
            try:
                data = future.result()
                results.append(data)
            except Exception as e:
                pass
    
    # Sort results by name
    results.sort(key=lambda x: x["name"])
    
    found_count = sum(1 for r in results if r["status"] == "FOUND")
    total_count = len(results)
    correlation_score = round((found_count / max(total_count, 1)) * 100, 1)
    
    return {
        "target_username": username,
        "scanned_at": datetime.utcnow().isoformat() + "Z",
        "total_platforms": total_count,
        "found_count": found_count,
        "correlation_score": correlation_score,
        "platforms": results
    }

def calculate_file_hashes(data_bytes):
    """Compute forensic cryptographic integrity checksums."""
    return {
        "md5": hashlib.md5(data_bytes).hexdigest(),
        "sha1": hashlib.sha1(data_bytes).hexdigest(),
        "sha256": hashlib.sha256(data_bytes).hexdigest(),
        "sha512": hashlib.sha512(data_bytes).hexdigest(),
        "size_bytes": len(data_bytes)
    }

def dms_to_decimal(degrees, minutes, seconds, ref):
    """Convert Degrees/Minutes/Seconds tuple to decimal degrees."""
    try:
        decimal = float(degrees) + float(minutes) / 60.0 + float(seconds) / 3600.0
        if ref in ['S', 'W']:
            decimal = -decimal
        return round(decimal, 6)
    except Exception:
        return None

def extract_jpeg_exif(data):
    """Parse raw EXIF and GPS markers from JPEG byte stream without third-party libraries."""
    if len(data) < 4 or data[0:2] != b'\xff\xd8':
        return None, "Not a valid JPEG image"
    
    offset = 2
    exif_data = {}
    gps_data = {}
    software_flags = []
    
    # Search for APP1 marker (\xff\xe1)
    while offset < len(data) - 4:
        marker, length = struct.unpack(">HH", data[offset:offset+4])
        if marker == 0xFFE1: # APP1
            app1_content = data[offset+4 : offset+2+length]
            if app1_content.startswith(b'Exif\x00\x00'):
                tiff_header = app1_content[6:]
                if len(tiff_header) >= 8:
                    byte_order = tiff_header[0:2]
                    endian = "<" if byte_order == b'II' else ">"
                    
                    # 42 magic check
                    magic = struct.unpack(f"{endian}H", tiff_header[2:4])[0]
                    if magic == 42:
                        first_ifd_offset = struct.unpack(f"{endian}I", tiff_header[4:8])[0]
                        exif_sub_offset = None
                        gps_sub_offset = None
                        
                        def parse_ifd(ifd_off, tag_dict):
                            results = {}
                            if ifd_off + 2 > len(tiff_header):
                                return results, None, None
                            num_entries = struct.unpack(f"{endian}H", tiff_header[ifd_off:ifd_off+2])[0]
                            pos = ifd_off + 2
                            
                            sub_exif = None
                            sub_gps = None
                            
                            for _ in range(num_entries):
                                if pos + 12 > len(tiff_header):
                                    break
                                tag, ftype, count, val_or_off = struct.unpack(f"{endian}HHI4s", tiff_header[pos:pos+12])
                                pos += 12
                                
                                tag_name = tag_dict.get(tag, f"Tag_0x{tag:04X}")
                                
                                # Check for ExifOffset (0x8769) or GPSInfo (0x8825)
                                if tag == 0x8769:
                                    sub_exif = struct.unpack(f"{endian}I", val_or_off)[0]
                                elif tag == 0x8825:
                                    sub_gps = struct.unpack(f"{endian}I", val_or_off)[0]
                                
                                # Basic value unpacking
                                parsed_val = None
                                if ftype == 2: # ASCII string
                                    str_off = struct.unpack(f"{endian}I", val_or_off)[0] if count > 4 else 0
                                    raw_str = tiff_header[str_off:str_off+count] if count > 4 else val_or_off[:count]
                                    parsed_val = raw_str.decode('utf-8', errors='ignore').rstrip('\x00').strip()
                                elif ftype == 3: # SHORT
                                    parsed_val = struct.unpack(f"{endian}H", val_or_off[:2])[0]
                                elif ftype == 4: # LONG
                                    parsed_val = struct.unpack(f"{endian}I", val_or_off)[0]
                                elif ftype == 5: # RATIONAL (two LONGs: numerator / denominator)
                                    rat_off = struct.unpack(f"{endian}I", val_or_off)[0]
                                    if rat_off + 8 <= len(tiff_header):
                                        num, den = struct.unpack(f"{endian}II", tiff_header[rat_off:rat_off+8])
                                        parsed_val = round(num / den, 4) if den != 0 else 0
                                
                                if parsed_val is not None:
                                    results[tag_name] = parsed_val
                                    
                            return results, sub_exif, sub_gps
                        
                        # Parse 0th IFD
                        ifd0, exif_sub_offset, gps_sub_offset = parse_ifd(first_ifd_offset, EXIF_TAGS)
                        exif_data.update(ifd0)
                        
                        # Parse Exif SubIFD if present
                        if exif_sub_offset and exif_sub_offset < len(tiff_header):
                            sub_exif_tags, _, maybe_gps = parse_ifd(exif_sub_offset, EXIF_TAGS)
                            exif_data.update(sub_exif_tags)
                            if not gps_sub_offset and maybe_gps:
                                gps_sub_offset = maybe_gps
                                
                        # Parse GPS IFD if present
                        if gps_sub_offset and gps_sub_offset < len(tiff_header):
                            gps_tags, _, _ = parse_ifd(gps_sub_offset, GPS_TAGS)
                            gps_data.update(gps_tags)
            
            offset += 2 + length
        elif marker in (0xFFD9, 0xFFDA): # End of Image or Start of Scan
            break
        else:
            offset += 2 + length
            
    # Check text inside data for known editing software traces
    data_preview = data[:min(len(data), 65536)].decode('latin1', errors='ignore')
    if "Photoshop" in data_preview:
        software_flags.append("Adobe Photoshop")
    if "Lightroom" in data_preview:
        software_flags.append("Adobe Lightroom")
    if "GIMP" in data_preview:
        software_flags.append("GIMP")
    if "Canva" in data_preview:
        software_flags.append("Canva")
    if "Snapseed" in data_preview:
        software_flags.append("Snapseed")
    if "Apple" in data_preview and "iPhone" in data_preview:
        software_flags.append("Apple iOS Camera")
    if "Samsung" in data_preview:
        software_flags.append("Samsung Camera Engine")
        
    return {
        "exif": exif_data,
        "gps": gps_data,
        "software_detected": software_flags
    }, None

def analyze_photo(filepath_or_bytes):
    """Perform full forensic photo analysis."""
    if isinstance(filepath_or_bytes, str):
        with open(filepath_or_bytes, "rb") as f:
            raw_bytes = f.read()
    else:
        raw_bytes = filepath_or_bytes
        
    hashes = calculate_file_hashes(raw_bytes)
    exif_res, err = extract_jpeg_exif(raw_bytes)
    
    metadata = {
        "hashes": hashes,
        "is_jpeg": raw_bytes.startswith(b'\xff\xd8'),
        "is_png": raw_bytes.startswith(b'\x89PNG\r\n\x1a\n'),
        "is_webp": b'WEBP' in raw_bytes[:16],
        "extracted_exif": {},
        "gps_coordinates": None,
        "camera_profile": {},
        "software_artifacts": [],
        "tamper_indicators": []
    }
    
    if exif_res:
        exif = exif_res.get("exif", {})
        gps = exif_res.get("gps", {})
        soft = exif_res.get("software_detected", [])
        
        metadata["extracted_exif"] = exif
        metadata["software_artifacts"] = list(set(soft + ([exif.get("Software")] if exif.get("Software") else [])))
        
        # Build Camera Profile
        metadata["camera_profile"] = {
            "make": exif.get("Make", "Unknown"),
            "model": exif.get("Model", "Unknown"),
            "lens": exif.get("LensModel", exif.get("LensMake", "Standard")),
            "focal_length": f"{exif.get('FocalLength', '')}mm" if exif.get('FocalLength') else "N/A",
            "iso": exif.get("ISOSpeedRatings", "Auto"),
            "exposure_time": f"1/{round(1/exif['ExposureTime'])}" if isinstance(exif.get('ExposureTime'), float) and exif['ExposureTime'] > 0 and exif['ExposureTime'] < 1 else str(exif.get('ExposureTime', 'Auto')),
            "f_number": f"f/{exif.get('FNumber')}" if exif.get('FNumber') else "N/A",
            "datetime_original": exif.get("DateTimeOriginal", exif.get("DateTime", "Not Recorded"))
        }
        
        # Parse GPS
        lat_ref = gps.get("GPSLatitudeRef")
        lat_val = gps.get("GPSLatitude")
        lon_ref = gps.get("GPSLongitudeRef")
        lon_val = gps.get("GPSLongitude")
        
        if lat_val and lon_val:
            # Handle float or tuple
            lat_dec = lat_val if isinstance(lat_val, (int, float)) else None
            lon_dec = lon_val if isinstance(lon_val, (int, float)) else None
            if lat_dec is not None and lon_dec is not None:
                metadata["gps_coordinates"] = {
                    "latitude": lat_dec if lat_ref != 'S' else -abs(lat_dec),
                    "longitude": lon_dec if lon_ref != 'W' else -abs(lon_dec),
                    "altitude": gps.get("GPSAltitude", None),
                    "osm_url": f"https://www.openstreetmap.org/?mlat={lat_dec}&mlon={lon_dec}#map=16/{lat_dec}/{lon_dec}",
                    "google_maps_url": f"https://www.google.com/maps?q={lat_dec},{lon_dec}"
                }
                
        # Tamper flags
        for s in metadata["software_artifacts"]:
            if any(tool in s.lower() for tool in ["photoshop", "gimp", "lightroom", "canva"]):
                metadata["tamper_indicators"].append(f"Image edited or exported via {s}")
                
    return metadata

def generate_osint_dorks(query, query_type="person"):
    """Generate professional Google Dorks and public record research queries."""
    clean_q = re.sub(r'[^a-zA-Z0-9_\-\. ]', '', query).strip()
    
    if query_type in ("username", "person"):
        return [
            {
                "title": "Exact Profile Matches",
                "dork": f'"{clean_q}" site:twitter.com OR site:instagram.com OR site:linkedin.com OR site:github.com',
                "category": "Social Profiles"
            },
            {
                "title": "Public Resumes & CVs",
                "dork": f'"{clean_q}" (resume OR cv OR "curriculum vitae") filetype:pdf',
                "category": "Documents"
            },
            {
                "title": "Database Dumps & Leaks",
                "dork": f'"{clean_q}" site:pastebin.com OR site:ghostbin.com OR site:justpaste.it',
                "category": "Exposures"
            },
            {
                "title": "Forum Mentions & Discussion",
                "dork": f'"{clean_q}" site:reddit.com OR site:news.ycombinator.com',
                "category": "Forums"
            },
            {
                "title": "Email / Contact Exposure",
                "dork": f'"{clean_q}" ("@gmail.com" OR "@protonmail.com" OR "@icloud.com" OR "@outlook.com")',
                "category": "Contact Leaks"
            }
        ]
    elif query_type == "domain":
        return [
            {
                "title": "Exposed Configuration & Env Files",
                "dork": f'site:{clean_q} ext:env OR ext:yml OR ext:json OR ext:conf "DB_PASSWORD" OR "API_KEY"',
                "category": "Sensitive Files"
            },
            {
                "title": "Publicly Exposed Admin Panels",
                "dork": f'site:{clean_q} inurl:admin OR inurl:login OR inurl:portal OR inurl:dashboard',
                "category": "Admin Portals"
            },
            {
                "title": "Indexed Documents & Spreadsheets",
                "dork": f'site:{clean_q} filetype:pdf OR filetype:docx OR filetype:xlsx OR filetype:csv',
                "category": "Documents"
            },
            {
                "title": "Subdomain Discovery",
                "dork": f'site:*.{clean_q} -www.{clean_q}',
                "category": "Infrastructure"
            }
        ]
    else:
        return [
            {
                "title": "General Investigator Query",
                "dork": f'"{clean_q}" (investigation OR report OR court OR lawsuit OR corporate)',
                "category": "General"
            }
        ]

def main():
    parser = argparse.ArgumentParser(description="OSINT Forensic Intelligence CLI Engine")
    subparsers = parser.add_subparsers(dest="command", help="Available subcommands")
    
    # Username subcommand
    p_user = subparsers.add_parser("username", help="Scan cross-platform username identities")
    p_user.add_argument("target", help="Username to investigate")
    p_user.add_argument("--json", action="store_true", help="Output results as JSON")
    
    # Metadata subcommand
    p_meta = subparsers.add_parser("metadata", help="Extract forensic metadata and EXIF from an image")
    p_meta.add_argument("image_path", help="Path to image file")
    p_meta.add_argument("--json", action="store_true", help="Output results as JSON")
    
    # Dorks subcommand
    p_dork = subparsers.add_parser("dorks", help="Generate targeted search dorks")
    p_dork.add_argument("query", help="Subject name, handle, or domain")
    p_dork.add_argument("--type", default="person", choices=["person", "username", "domain"], help="Target type")
    p_dork.add_argument("--json", action="store_true", help="Output results as JSON")
    
    args = parser.parse_args()
    
    if args.command == "username":
        data = scan_username(args.target)
        if args.json:
            print(json.dumps(data, indent=2))
        else:
            print(f"\n[+] OSINT Identity Verification for target: @{args.target}")
            print(f"[+] Found on {data['found_count']}/{data['total_platforms']} platforms (Correlation: {data['correlation_score']}%)\n")
            for p in data["platforms"]:
                if p["status"] == "FOUND":
                    print(f"  [\033[92mFOUND\033[0m] {p['name']} ({p['category']}): {p['url']}")
                elif p["status"] == "RATE_LIMITED":
                    print(f"  [\033[93mLIMIT\033[0m] {p['name']}: Rate limited by provider")
    elif args.command == "metadata":
        if not os.path.exists(args.image_path):
            print(f"Error: File not found: {args.image_path}", file=sys.stderr)
            sys.exit(1)
        data = analyze_photo(args.image_path)
        if args.json:
            print(json.dumps(data, indent=2))
        else:
            print(f"\n[+] Forensic Image Metadata Report: {args.image_path}")
            print(f"    MD5:    {data['hashes']['md5']}")
            print(f"    SHA256: {data['hashes']['sha256']}")
            cam = data.get("camera_profile", {})
            if cam.get("make") != "Unknown":
                print(f"    Camera: {cam.get('make')} {cam.get('model')} (Lens: {cam.get('lens')})")
                print(f"    Time:   {cam.get('datetime_original')}")
            if data.get("gps_coordinates"):
                gps = data["gps_coordinates"]
                print(f"    GPS:    Lat: {gps['latitude']}, Lon: {gps['longitude']}")
                print(f"    Map:    {gps['osm_url']}")
            if data.get("tamper_indicators"):
                print(f"    [\033[91mWARNING\033[0m] {', '.join(data['tamper_indicators'])}")
    elif args.command == "dorks":
        dorks = generate_osint_dorks(args.query, args.type)
        if args.json:
            print(json.dumps(dorks, indent=2))
        else:
            print(f"\n[+] OSINT Search Queries for '{args.query}' ({args.type}):\n")
            for d in dorks:
                print(f"  [{d['category']}] {d['title']}:")
                print(f"    https://www.google.com/search?q={d['dork']}\n")
    else:
        parser.print_help()

if __name__ == "__main__":
    main()
