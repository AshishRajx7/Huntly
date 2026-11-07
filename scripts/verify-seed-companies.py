import urllib.request
import json

companies = [
    # Ashby
    {"id": "runpod", "name": "RunPod", "atsProvider": "ashby", "atsToken": "runpod", "websiteUrl": "https://runpod.io", "careerPageUrl": "https://jobs.ashbyhq.com/runpod"},
    {"id": "posthog", "name": "PostHog", "atsProvider": "ashby", "atsToken": "posthog", "websiteUrl": "https://posthog.com", "careerPageUrl": "https://jobs.ashbyhq.com/posthog"},
    {"id": "linear", "name": "Linear", "atsProvider": "ashby", "atsToken": "linear", "websiteUrl": "https://linear.app", "careerPageUrl": "https://jobs.ashbyhq.com/linear"},
    {"id": "resend", "name": "Resend", "atsProvider": "ashby", "atsToken": "resend", "websiteUrl": "https://resend.com", "careerPageUrl": "https://jobs.ashbyhq.com/resend"},
    {"id": "truemed", "name": "Truemed", "atsProvider": "ashby", "atsToken": "truemed", "websiteUrl": "https://truemed.com", "careerPageUrl": "https://jobs.ashbyhq.com/truemed"},
    {"id": "injective-labs", "name": "Injective Labs", "atsProvider": "ashby", "atsToken": "injective-labs", "websiteUrl": "https://injective.com", "careerPageUrl": "https://jobs.ashbyhq.com/injective-labs"},
    {"id": "genmd", "name": "GenMD", "atsProvider": "ashby", "atsToken": "genmd", "websiteUrl": "https://genmd.com", "careerPageUrl": "https://jobs.ashbyhq.com/genmd"},
    {"id": "primeintellect", "name": "Prime Intellect", "atsProvider": "ashby", "atsToken": "PrimeIntellect", "websiteUrl": "https://primeintellect.ai", "careerPageUrl": "https://jobs.ashbyhq.com/PrimeIntellect"},
    {"id": "provable", "name": "Provable", "atsProvider": "ashby", "atsToken": "provable", "websiteUrl": "https://provable.com", "careerPageUrl": "https://jobs.ashbyhq.com/provable"},
    {"id": "statar-capital", "name": "Statar Capital", "atsProvider": "ashby", "atsToken": "statar-capital", "websiteUrl": "https://statarcapital.com", "careerPageUrl": "https://jobs.ashbyhq.com/statar-capital"},
    {"id": "people-data-labs", "name": "People Data Labs", "atsProvider": "ashby", "atsToken": "people-data-labs", "websiteUrl": "https://peopledatalabs.com", "careerPageUrl": "https://jobs.ashbyhq.com/people-data-labs"},
    {"id": "circuithub", "name": "CircuitHub", "atsProvider": "ashby", "atsToken": "circuithub", "websiteUrl": "https://circuithub.com", "careerPageUrl": "https://jobs.ashbyhq.com/circuithub"},
    {"id": "polygon-labs", "name": "Polygon Labs", "atsProvider": "ashby", "atsToken": "polygon-labs", "websiteUrl": "https://polygon.technology", "careerPageUrl": "https://jobs.ashbyhq.com/polygon-labs"},
    {"id": "replit", "name": "Replit", "atsProvider": "ashby", "atsToken": "replit", "websiteUrl": "https://replit.com", "careerPageUrl": "https://jobs.ashbyhq.com/replit"},
    {"id": "sentry", "name": "Sentry", "atsProvider": "ashby", "atsToken": "sentry", "websiteUrl": "https://sentry.io", "careerPageUrl": "https://jobs.ashbyhq.com/sentry"},
    {"id": "perplexity", "name": "Perplexity AI", "atsProvider": "ashby", "atsToken": "perplexity", "websiteUrl": "https://perplexity.ai", "careerPageUrl": "https://jobs.ashbyhq.com/perplexity"},
    {"id": "dust", "name": "Dust", "atsProvider": "ashby", "atsToken": "dust", "websiteUrl": "https://dust.tt", "careerPageUrl": "https://jobs.ashbyhq.com/dust"},
    {"id": "vapi", "name": "Vapi AI", "atsProvider": "ashby", "atsToken": "vapi", "websiteUrl": "https://vapi.ai", "careerPageUrl": "https://jobs.ashbyhq.com/vapi"},
    {"id": "airbyte", "name": "Airbyte", "atsProvider": "ashby", "atsToken": "airbyte", "websiteUrl": "https://airbyte.com", "careerPageUrl": "https://jobs.ashbyhq.com/airbyte"},
    {"id": "supabase", "name": "Supabase", "atsProvider": "ashby", "atsToken": "supabase", "websiteUrl": "https://supabase.com", "careerPageUrl": "https://jobs.ashbyhq.com/supabase"},

    # Greenhouse
    {"id": "sezzle", "name": "Sezzle", "atsProvider": "greenhouse", "atsToken": "sezzle", "websiteUrl": "https://sezzle.com", "careerPageUrl": "https://boards.greenhouse.io/sezzle"},
    {"id": "cloudflare", "name": "Cloudflare", "atsProvider": "greenhouse", "atsToken": "cloudflare", "websiteUrl": "https://cloudflare.com", "careerPageUrl": "https://boards.greenhouse.io/cloudflare"},
    {"id": "stripe", "name": "Stripe", "atsProvider": "greenhouse", "atsToken": "stripe", "websiteUrl": "https://stripe.com", "careerPageUrl": "https://boards.greenhouse.io/stripe"},
    {"id": "figma", "name": "Figma", "atsProvider": "greenhouse", "atsToken": "figma", "websiteUrl": "https://figma.com", "careerPageUrl": "https://boards.greenhouse.io/figma"},
    {"id": "gitlab", "name": "GitLab", "atsProvider": "greenhouse", "atsToken": "gitlab", "websiteUrl": "https://gitlab.com", "careerPageUrl": "https://boards.greenhouse.io/gitlab"},
    {"id": "datadog", "name": "Datadog", "atsProvider": "greenhouse", "atsToken": "datadog", "websiteUrl": "https://datadoghq.com", "careerPageUrl": "https://boards.greenhouse.io/datadog"},
    {"id": "elastic", "name": "Elastic", "atsProvider": "greenhouse", "atsToken": "elastic", "websiteUrl": "https://elastic.co", "careerPageUrl": "https://boards.greenhouse.io/elastic"},
    {"id": "mongodb", "name": "MongoDB", "atsProvider": "greenhouse", "atsToken": "mongodb", "websiteUrl": "https://mongodb.com", "careerPageUrl": "https://boards.greenhouse.io/mongodb"},
    {"id": "reddit", "name": "Reddit", "atsProvider": "greenhouse", "atsToken": "reddit", "websiteUrl": "https://reddit.com", "careerPageUrl": "https://boards.greenhouse.io/reddit"},
    {"id": "affirm", "name": "Affirm", "atsProvider": "greenhouse", "atsToken": "affirm", "websiteUrl": "https://affirm.com", "careerPageUrl": "https://boards.greenhouse.io/affirm"},
    {"id": "instacart", "name": "Instacart", "atsProvider": "greenhouse", "atsToken": "instacart", "websiteUrl": "https://instacart.com", "careerPageUrl": "https://boards.greenhouse.io/instacart"},
    {"id": "brex", "name": "Brex", "atsProvider": "greenhouse", "atsToken": "brex", "websiteUrl": "https://brex.com", "careerPageUrl": "https://boards.greenhouse.io/brex"},
    {"id": "coinbase", "name": "Coinbase", "atsProvider": "greenhouse", "atsToken": "coinbase", "websiteUrl": "https://coinbase.com", "careerPageUrl": "https://boards.greenhouse.io/coinbase"},
    {"id": "hubspot", "name": "HubSpot", "atsProvider": "greenhouse", "atsToken": "hubspot", "websiteUrl": "https://hubspot.com", "careerPageUrl": "https://boards.greenhouse.io/hubspot"},
    {"id": "twilio", "name": "Twilio", "atsProvider": "greenhouse", "atsToken": "twilio", "websiteUrl": "https://twilio.com", "careerPageUrl": "https://boards.greenhouse.io/twilio"},
    {"id": "razorpay", "name": "Razorpay", "atsProvider": "greenhouse", "atsToken": "razorpaysoftwareprivatelimited", "websiteUrl": "https://razorpay.com", "careerPageUrl": "https://boards.greenhouse.io/razorpaysoftwareprivatelimited"},
    {"id": "swiggy", "name": "Swiggy", "atsProvider": "greenhouse", "atsToken": "swiggy", "websiteUrl": "https://swiggy.com", "careerPageUrl": "https://boards.greenhouse.io/swiggy"},
    {"id": "github", "name": "GitHub", "atsProvider": "greenhouse", "atsToken": "github", "websiteUrl": "https://github.com", "careerPageUrl": "https://boards.greenhouse.io/github"},
    {"id": "remote-gh", "name": "Remote", "atsProvider": "greenhouse", "atsToken": "remotecom", "websiteUrl": "https://remote.com", "careerPageUrl": "https://boards.greenhouse.io/remotecom"},
    {"id": "grammarly", "name": "Grammarly", "atsProvider": "greenhouse", "atsToken": "grammarly", "websiteUrl": "https://grammarly.com", "careerPageUrl": "https://boards.greenhouse.io/grammarly"},

    # Lever
    {"id": "kinsta", "name": "Kinsta", "atsProvider": "lever", "atsToken": "kinsta", "websiteUrl": "https://kinsta.com", "careerPageUrl": "https://jobs.lever.co/kinsta"},
    {"id": "deliveroo", "name": "Deliveroo", "atsProvider": "lever", "atsToken": "deliveroo", "websiteUrl": "https://deliveroo.co.uk", "careerPageUrl": "https://jobs.lever.co/deliveroo"},
    {"id": "benchling", "name": "Benchling", "atsProvider": "lever", "atsToken": "benchling", "websiteUrl": "https://benchling.com", "careerPageUrl": "https://jobs.lever.co/benchling"},
    {"id": "fullstory", "name": "FullStory", "atsProvider": "lever", "atsToken": "fullstory", "websiteUrl": "https://fullstory.com", "careerPageUrl": "https://jobs.lever.co/fullstory"},
    {"id": "dune", "name": "Dune", "atsProvider": "lever", "atsToken": "dune", "websiteUrl": "https://dune.com", "careerPageUrl": "https://jobs.lever.co/dune"},
    {"id": "safetywing", "name": "SafetyWing", "atsProvider": "lever", "atsToken": "safetywing", "websiteUrl": "https://safetywing.com", "careerPageUrl": "https://jobs.lever.co/safetywing"},
    {"id": "automattic", "name": "Automattic", "atsProvider": "lever", "atsToken": "automattic", "websiteUrl": "https://automattic.com", "careerPageUrl": "https://jobs.lever.co/automattic"},
    {"id": "hotjar", "name": "Hotjar", "atsProvider": "lever", "atsToken": "hotjar", "websiteUrl": "https://hotjar.com", "careerPageUrl": "https://jobs.lever.co/hotjar"},
    {"id": "palantir", "name": "Palantir", "atsProvider": "lever", "atsToken": "palantir", "websiteUrl": "https://palantir.com", "careerPageUrl": "https://jobs.lever.co/palantir"},
    {"id": "spotify", "name": "Spotify", "atsProvider": "lever", "atsToken": "spotify", "websiteUrl": "https://spotify.com", "careerPageUrl": "https://jobs.lever.co/spotify"},
    {"id": "clever", "name": "Clever", "atsProvider": "lever", "atsToken": "clever", "websiteUrl": "https://clever.com", "careerPageUrl": "https://jobs.lever.co/clever"},
    {"id": "atlassian", "name": "Atlassian", "atsProvider": "lever", "atsToken": "atlassian", "websiteUrl": "https://atlassian.com", "careerPageUrl": "https://jobs.lever.co/atlassian"},
    {"id": "reddit-lever", "name": "Reddit Careers", "atsProvider": "lever", "atsToken": "reddit", "websiteUrl": "https://reddit.com", "careerPageUrl": "https://jobs.lever.co/reddit"},
    {"id": "gusto", "name": "Gusto", "atsProvider": "lever", "atsToken": "gusto", "websiteUrl": "https://gusto.com", "careerPageUrl": "https://jobs.lever.co/gusto"},
    {"id": "zepto", "name": "Zepto", "atsProvider": "greenhouse", "atsToken": "zepto", "websiteUrl": "https://zepto.com", "careerPageUrl": "https://boards.greenhouse.io/zepto"},
    {"id": "cred", "name": "CRED", "atsProvider": "greenhouse", "atsToken": "cred", "websiteUrl": "https://cred.club", "careerPageUrl": "https://boards.greenhouse.io/cred"},
    {"id": "postman", "name": "Postman", "atsProvider": "greenhouse", "atsToken": "postman", "websiteUrl": "https://postman.com", "careerPageUrl": "https://boards.greenhouse.io/postman"},
    {"id": "browserstack", "name": "BrowserStack", "atsProvider": "greenhouse", "atsToken": "browserstack", "websiteUrl": "https://browserstack.com", "careerPageUrl": "https://boards.greenhouse.io/browserstack"},
    {"id": "hasura", "name": "Hasura", "atsProvider": "greenhouse", "atsToken": "hasura", "websiteUrl": "https://hasura.io", "careerPageUrl": "https://boards.greenhouse.io/hasura"},
    {"id": "groww", "name": "Groww", "atsProvider": "greenhouse", "atsToken": "groww", "websiteUrl": "https://groww.in", "careerPageUrl": "https://boards.greenhouse.io/groww"}
]

verified = []
failed = []

for c in companies:
    prov = c["atsProvider"]
    token = c["atsToken"]
    if prov == "ashby":
        url = f"https://api.ashbyhq.com/posting-api/job-board/{token}"
    elif prov == "greenhouse":
        url = f"https://boards-api.greenhouse.io/v1/boards/{token}/jobs"
    elif prov == "lever":
        url = f"https://api.lever.co/v0/postings/{token}?mode=json"
    
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Huntly/1.0"})
        with urllib.request.urlopen(req, timeout=4) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            if prov == "ashby" and "jobs" in data:
                count = len(data["jobs"])
            elif prov == "greenhouse" and "jobs" in data:
                count = len(data["jobs"])
            elif prov == "lever" and isinstance(data, list):
                count = len(data)
            else:
                count = 0
            verified.append({**c, "jobCount": count})
            print(f"VERIFIED: {c['name']} ({prov}): {count} jobs")
    except Exception as e:
        failed.append({**c, "error": str(e)})
        print(f"FAILED: {c['name']} ({prov}): {e}")

print(f"\nTotal Verified: {len(verified)}, Total Failed: {len(failed)}")

with open(r"src\lib\companies\verified-companies.json", "w", encoding="utf-8") as f:
    json.dump(verified, f, indent=2)
print("Saved verified companies to src/lib/companies/verified-companies.json")

