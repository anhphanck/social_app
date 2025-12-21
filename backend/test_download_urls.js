
import https from 'https';

const baseUrl = "https://res.cloudinary.com/dfii17kbe/raw/upload";
const path = "/v1/social_app/documents/m2m0zz6lbvfhvdkdm7ax";

const urls = [
  `${baseUrl}${path}`,
  `${baseUrl}/fl_attachment${path}`,
  `${baseUrl}/fl_attachment:test.pptx${path}`,
];

urls.forEach(url => {
  https.get(url, (res) => {
    console.log(`Code: ${res.statusCode} | URL: ${url}`);
    if (res.statusCode === 200) {
        console.log(`  Content-Disposition: ${res.headers['content-disposition']}`);
    }
  }).on('error', e => console.log(`Error: ${url} - ${e.message}`));
});
