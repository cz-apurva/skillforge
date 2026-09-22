const puppeteer = require('./backend-core/node_modules/puppeteer');
const path = require('path');
const fs = require('fs');

const OUT_DIR = path.join(__dirname, 'report_images_40p');
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

async function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function clickButtonByText(page, text) {
  return page.evaluate((targetText) => {
    const buttons = Array.from(document.querySelectorAll('button, a, div[role="button"]'));
    const btn = buttons.find((b) => b.innerText && b.innerText.trim().toLowerCase().includes(targetText.toLowerCase()));
    if (btn) {
      btn.click();
      return true;
    }
    return false;
  }, text);
}

async function captureAll() {
  console.log('Starting Chrome to capture SkillForge screenshots...');
  
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: 'new',
    defaultViewport: { width: 1440, height: 900, deviceScaleFactor: 2 },
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  try {
    // 1. Login Screen
    console.log('Capturing Screen 1: Login Portal...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
    await delay(1000);
    await page.screenshot({ path: path.join(OUT_DIR, 'screen_1_login.png') });

    // 2. Student Portal
    console.log('Logging in as Student...');
    await clickButtonByText(page, 'Student');
    await delay(1500);

    // Screen 2: Student Dashboard
    console.log('Capturing Screen 2: Student Dashboard...');
    await page.screenshot({ path: path.join(OUT_DIR, 'screen_2_student_dashboard.png') });

    // Screen 3: Student Materials
    console.log('Capturing Screen 3: Learning Materials...');
    await clickButtonByText(page, 'Learning Materials');
    await delay(1000);
    await page.screenshot({ path: path.join(OUT_DIR, 'screen_3_student_materials.png') });

    // Screen 4: Socratic Tutor
    console.log('Capturing Screen 4: Socratic AI Tutor...');
    await clickButtonByText(page, 'AI Tutor');
    await delay(1000);
    await page.screenshot({ path: path.join(OUT_DIR, 'screen_4_student_socratic_tutor.png') });

    // Screen 5: Sandbox View
    console.log('Capturing Screen 5: Code Sandbox...');
    await clickButtonByText(page, 'Sandbox');
    await delay(1000);
    await page.screenshot({ path: path.join(OUT_DIR, 'screen_5_student_code_sandbox.png') });

    // Screen 6: Student Progress
    console.log('Capturing Screen 6: Student Progress...');
    await clickButtonByText(page, 'Progress');
    await delay(1000);
    await page.screenshot({ path: path.join(OUT_DIR, 'screen_6_student_progress.png') });

    // 3. Teacher Portal
    console.log('Logging in as Teacher...');
    await page.evaluate(() => localStorage.clear());
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
    await delay(500);

    await clickButtonByText(page, 'Teacher');
    await delay(1500);

    // Screen 7: Teacher Dashboard
    console.log('Capturing Screen 7: Teacher Dashboard...');
    await page.screenshot({ path: path.join(OUT_DIR, 'screen_7_teacher_dashboard.png') });

    // Screen 8: Teacher Intervention Center
    console.log('Capturing Screen 8: Teacher Intervention Center...');
    await clickButtonByText(page, 'Interventions') || await clickButtonByText(page, 'Intervention');
    await delay(1000);
    await page.screenshot({ path: path.join(OUT_DIR, 'screen_8_teacher_intervention.png') });

    // Screen 9: Teacher Course Materials
    console.log('Capturing Screen 9: Teacher Course Materials...');
    await clickButtonByText(page, 'Course Materials') || await clickButtonByText(page, 'Materials');
    await delay(1000);
    await page.screenshot({ path: path.join(OUT_DIR, 'screen_9_teacher_materials.png') });

    // 4. Admin Portal
    console.log('Logging in as Admin...');
    await page.evaluate(() => localStorage.clear());
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
    await delay(500);

    await clickButtonByText(page, 'Admin');
    await delay(1500);

    // Screen 10: Admin Services
    console.log('Capturing Screen 10: Admin Services...');
    await clickButtonByText(page, 'AI Services') || await clickButtonByText(page, 'Services');
    await delay(1000);
    await page.screenshot({ path: path.join(OUT_DIR, 'screen_10_admin_services.png') });

    console.log('All 10 UI Screens captured successfully!');
  } catch (err) {
    console.error('Error during screen capture:', err);
  } finally {
    await browser.close();
  }
}

captureAll();
