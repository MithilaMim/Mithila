import PDFDocument from 'pdfkit';
import type { PortfolioData } from '../types/portfolio.ts';

export function buildCvPdfBuffer(data: PortfolioData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 54,
        info: {
          Title: `${data.profile.fullName} — Curriculum Vitae`,
          Author: data.profile.fullName,
          Subject: 'Curriculum Vitae',
        },
      });

      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const charcoal = '#18181B';
      const muted = '#52525B';
      const lavenderAccent = '#5E4B94';
      const divider = '#E4E2DD';

      // Header
      doc.fillColor(charcoal).font('Helvetica-Bold').fontSize(22).text(data.profile.fullName.toUpperCase());
      doc.moveDown(0.25);
      doc.fillColor(lavenderAccent).font('Helvetica').fontSize(10.5).text(data.profile.subtitle);
      doc.moveDown(0.5);

      const contactLine = [
        data.profile.location,
        data.profile.contactEmail,
        data.profile.contactPhone,
      ]
        .filter(Boolean)
        .join('  •  ');
      if (contactLine) {
        doc.fillColor(muted).font('Helvetica').fontSize(9.5).text(contactLine);
      }

      doc.moveDown(0.8);
      doc.strokeColor(divider).lineWidth(1).moveTo(54, doc.y).lineTo(541, doc.y).stroke();
      doc.moveDown(1);

      // Career Objective
      doc.fillColor(lavenderAccent).font('Helvetica-Bold').fontSize(10).text('CAREER OBJECTIVE');
      doc.moveDown(0.35);
      doc
        .fillColor(charcoal)
        .font('Helvetica')
        .fontSize(10.5)
        .text(data.profile.careerObjective || data.profile.heroDescription, {
          lineGap: 3,
        });
      doc.moveDown(1);

      // About Me
      doc.fillColor(lavenderAccent).font('Helvetica-Bold').fontSize(10).text('PERSONAL PROFILE');
      doc.moveDown(0.35);
      doc.fillColor(charcoal).font('Helvetica').fontSize(10.5).text(data.profile.aboutBio, {
        lineGap: 3,
      });
      doc.moveDown(0.5);
      doc.fillColor(muted).font('Helvetica').fontSize(9.5).text(
        `Nationality: ${data.profile.nationality}   |   Location: ${data.profile.location}   |   Availability: ${data.profile.availability}`,
      );
      doc.moveDown(1);

      // Education
      doc.fillColor(lavenderAccent).font('Helvetica-Bold').fontSize(10).text('EDUCATION');
      doc.moveDown(0.45);
      for (const edu of data.education) {
        doc.fillColor(charcoal).font('Helvetica-Bold').fontSize(11).text(`${edu.degree} — ${edu.year}`);
        const details = [
          `Group: ${edu.studyGroup}`,
          `Board: ${edu.board}`,
          `GPA: ${edu.gpa}`,
          edu.institution ? `Institution: ${edu.institution}` : '',
        ]
          .filter(Boolean)
          .join('   •   ');
        doc.fillColor(muted).font('Helvetica').fontSize(10).text(details);
        if (edu.notes) {
          doc.fillColor(muted).font('Helvetica').fontSize(9.5).text(edu.notes);
        }
        doc.moveDown(0.55);
      }
      doc.moveDown(0.4);

      // Skills & Languages
      doc.fillColor(lavenderAccent).font('Helvetica-Bold').fontSize(10).text('LANGUAGES & SKILLS');
      doc.moveDown(0.45);
      for (const skill of data.skills) {
        doc
          .fillColor(charcoal)
          .font('Helvetica-Bold')
          .fontSize(10.5)
          .text(`${skill.name}`, { continued: true })
          .font('Helvetica')
          .fillColor(muted)
          .text(` — ${skill.proficiency} (${skill.category})`);
        if (skill.description) {
          doc.fillColor(muted).font('Helvetica').fontSize(9.5).text(skill.description);
        }
        doc.moveDown(0.35);
      }

      // Projects if any exist
      if (data.projects.length > 0) {
        doc.moveDown(0.5);
        doc.fillColor(lavenderAccent).font('Helvetica-Bold').fontSize(10).text('SELECTED PROJECTS');
        doc.moveDown(0.45);
        for (const proj of data.projects) {
          doc.fillColor(charcoal).font('Helvetica-Bold').fontSize(10.5).text(`${proj.title} (${proj.category})`);
          doc.fillColor(muted).font('Helvetica').fontSize(9.5).text(proj.description, { lineGap: 2 });
          if (proj.projectUrl) {
            doc.fillColor(lavenderAccent).font('Helvetica').fontSize(9).text(proj.projectUrl);
          }
          doc.moveDown(0.45);
        }
      }

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}
