import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

export interface GeneratedPdfFixture {
  title: string;
  filename: string;
  buffer: Buffer;
  pageCount: number;
  pagesContent: string[][];
}

export async function generateSamplePdfs(): Promise<GeneratedPdfFixture[]> {
  const fixtures: GeneratedPdfFixture[] = [];

  // Helper to create a multi-page PDF document
  async function createPdf(
    title: string,
    filename: string,
    pagesContent: string[][],
  ): Promise<GeneratedPdfFixture> {
    const pdfDoc = await PDFDocument.create();
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);

    for (let p = 0; p < pagesContent.length; p++) {
      const page = pdfDoc.addPage([595.28, 841.89]); // A4
      const lines = pagesContent[p] || [];

      // Header
      page.drawText(title, {
        x: 50,
        y: 800,
        size: 16,
        font: fontBold,
        color: rgb(0.1, 0.1, 0.2),
      });

      page.drawText(`Page ${p + 1} of ${pagesContent.length}`, {
        x: 480,
        y: 800,
        size: 10,
        font: fontRegular,
        color: rgb(0.4, 0.4, 0.4),
      });

      let currentY = 760;
      for (const line of lines) {
        if (!line.trim()) {
          currentY -= 15;
          continue;
        }

        const isHeading = line.startsWith('## ');
        const text = isHeading ? line.replace('## ', '') : line;
        const font = isHeading ? fontBold : fontRegular;
        const size = isHeading ? 12 : 10;
        const color = isHeading ? rgb(0.15, 0.15, 0.4) : rgb(0.2, 0.2, 0.2);

        page.drawText(text, {
          x: 50,
          y: currentY,
          size,
          font,
          color,
          maxWidth: 495,
        });

        currentY -= isHeading ? 22 : 16;
      }
    }

    const pdfBytes = await pdfDoc.save();
    return {
      title,
      filename,
      buffer: Buffer.from(pdfBytes),
      pageCount: pagesContent.length,
      pagesContent,
    };
  }

  // 1. Leave Policy (2 pages)
  const leavePolicy = await createPdf('Leave Policy', 'leave_policy.pdf', [
    [
      '## 1. General Leave Entitlements for Staff',
      'This document outlines school attendance, leave protocols, and expectations.',
      '',
      '## 2. Emergency Sick Leave Procedure',
      'In cases of unexpected illness, staff must inform principal by 7:30 AM via official portal.',
      'Staff must submit medical certificate if more than 2 days of sick leave are taken consecutively.',
      '',
      '## 3. Casual Leave Allowances',
      'All full-time teachers are entitled to 12 casual leaves per academic year.',
      'Casual leaves are credited in two tranches of 6 days at the start of each semester.',
      'Unavailed casual leaves lapse at the end of the academic year.',
    ],
    [
      '## 4. Student Attendance and Unexcused Absences',
      'Student regular attendance is mandatory for academic progress.',
      'If a student is absent without notice for 3 consecutive days, class teacher contacts parents directly.',
      'A written excuse note required upon return signed by the designated parent or legal guardian.',
      '',
      '## 5. Planned Leaves and Vacations',
      'Parents should avoid scheduling personal travel during active academic term periods.',
      'For exceptional circumstances, prior written approval from Principal required at least 5 working days in advance.',
      'Any absence exceeding 10 consecutive instructional days requires formal Board committee review.',
    ],
  ]);
  fixtures.push(leavePolicy);

  // 2. Fee Structure (2 pages)
  const feeStructure = await createPdf('Fee Structure', 'fee_structure.pdf', [
    [
      '## 1. Annual Tuition and Term Schedules',
      'Annual academic fees are billed across two equal semi-annual installments.',
      '',
      '## 2. Term 2 Tuition Due Dates and Penalties',
      'The deadline for paying the Term 2 tuition fee is November 15th.',
      'Following a 5-day grace window, a late fine of 50 rupees per day after grace period applies.',
      '',
      '## 3. Approved Payment Methods',
      'School fee payments are accepted through ERP portal payment gateway or NEFT/RTGS with transaction ref.',
      'Cash payments are strictly prohibited at administrative counter desks.',
    ],
    [
      '## 4. Concessions and Sibling Discounts',
      'Families with multiple enrolled children qualify for tuition support benefits.',
      'The school grants a 10% sibling discount on tuition fee applicable to younger sibling only.',
      '',
      '## 5. Transportation and Bus Route Charges',
      'School bus transportation is zoned by transit distance sectors.',
      'For residential sector Route B, the transport fee is 1200 rupees monthly or 3600 quarterly.',
      'Annual activity and lab facility surcharges are included directly in the first term assessment invoice.',
    ],
  ]);
  fixtures.push(feeStructure);

  // 3. Holiday Calendar (2 pages)
  const holidayCalendar = await createPdf('Holiday Calendar', 'holiday_calendar.pdf', [
    [
      '## 1. Annual Academic Calendar & Break Schedules',
      'Official calendar of non-instructional holidays, festivals, and commemorative celebrations.',
      '',
      '## 2. Winter Vacation Schedule',
      'The annual winter vacation break begins on December 24 and concludes on January 2.',
      'All instructional classes resume on January 3 for both primary and secondary divisions.',
      '',
      '## 3. National Celebrations and Working Observances',
      'Republic Day on January 26 is designated as a national celebration day.',
      'Attendance mandatory for staff from 8:00 AM to 11:00 AM for the flag hoisting assembly and civic ceremonies.',
      '',
      '## 4. Autumn Festive Holidays',
      'National holiday for Gandhi Jayanti on October 2.',
      'The school will observe the Dussehra break from October 11 to October 14.',
    ],
    [
      '## 5. Parent-Teacher Conferences & Evaluation Milestones',
      'Regular academic review meetings facilitate parent-educator communication.',
      'Parent-teacher meetings are scheduled on quarterly Saturdays following term examinations.',
      '',
      '## 6. Summer Recess Dates',
      'Summer vacation commences on May 20 and concludes on July 1.',
      'Faculty development workshops will occur during the final week of June.',
    ],
  ]);
  fixtures.push(holidayCalendar);

  // 4. Class 8 Exam Circular (2 pages)
  const class8Circular = await createPdf('Class 8 Exam Circular', 'class_8_exam_circular.pdf', [
    [
      '## 1. Class 8 Midterm Examination Instructions',
      'Notice to all Class 8 educators, registered students, and designated guardians.',
      '',
      '## 2. Midterm Dates and Session Timings',
      'The Class 8 midterm examination series starts September 18 and runs through September 28.',
      'All morning test sittings operate from 9:00 AM to 12:00 PM.',
      'Students must report to the examination hall Wing B by 8:45 AM for attendance and verification.',
      '',
      '## 3. Mathematics Syllabus Breakdown',
      'The syllabus for the Class 8 Mathematics midterm exam encompasses Chapters 1 through 6.',
      'Primary assessment areas: Linear Equations, Rational Numbers, Quadrilaterals, and Data Handling.',
    ],
    [
      '## 4. Examination Hall Regulations & Allowed Materials',
      'Students must display valid school ID cards throughout all testing periods.',
      'Calculators are strictly prohibited for Class 8 exams. Logarithm tables will be provided.',
      '',
      '## 5. Results Announcement and Paper Discussion',
      'Graded examination scripts will be returned during instructional review hours by October 8.',
      'Mark sheets will be released on the parent portal upon approval by the academic board.',
    ],
  ]);
  fixtures.push(class8Circular);

  // 5. Staff Handbook (3 pages - Teachers only)
  const staffHandbook = await createPdf('Staff Handbook', 'staff_handbook.pdf', [
    [
      '## 1. Staff Code of Conduct and Professional Standards',
      'Internal guidelines for certified instructional faculty and academic personnel.',
      '',
      '## 2. Professional Attire and Dress Code',
      'Faculty members represent the dignity of the academic institution.',
      'All teachers must maintain formal attire or school-approved blazers on Mondays and Fridays.',
      'Casual footwear, denim, and uncollared shirts are impermissible during instructional hours.',
      '',
      '## 3. Attendance Timings and Punctuality',
      'Instructional staff must sign into biometric logging stations by 7:45 AM daily.',
    ],
    [
      '## 4. Campus Recess Monitoring and Duty Roster',
      'Ensuring student safety across the premises during recreation breaks is a critical staff obligation.',
      'A recess monitoring roster assigned weekly specifies rotating teacher posts.',
      'Designated teachers must be stationed in designated courtyard corridors throughout the 30-minute interval.',
      '',
      '## 5. Personal Device and Mobile Phone Policy',
      'To prevent distraction in learning spaces, phones must remain on silent in teacher lockers or designated desks.',
      'Emergency personal calls may only be received within the faculty lounge during unassigned planning periods.',
    ],
    [
      '## 6. Staff Leave Policies and Parental Support',
      'Instructional faculty qualify for extended statutory leave provisions.',
      'Staff seeking maternity or paternity leave must apply 4 weeks in advance with medical documentation to HR.',
      '',
      '## 7. Performance Appraisals and Compensation Reviews',
      'Confidential annual performance appraisals occur in April.',
      'The compensation committee administers internal teacher performance bonuses and salary reviews based on peer evaluations.',
    ],
  ]);
  fixtures.push(staffHandbook);

  return fixtures;
}
