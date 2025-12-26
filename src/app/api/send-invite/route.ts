import { Resend } from 'resend';
import { NextResponse } from 'next/server';

const resend = new Resend(process.env.RESEND_API_KEY || 're_not_set');

export async function POST(request: Request) {
    try {
        const { inviteeEmail, inviterName, quizTitle, inviteLink, language = 'vi' } = await request.json();

        if (!process.env.RESEND_API_KEY) {
            return NextResponse.json({ 
                success: false, 
                error: language === 'vi' ? "Vui lòng cấu hình RESEND_API_KEY trong .env." : "Please configure RESEND_API_KEY in .env."
            });
        }

        const isVi = language === 'vi';
        const subject = isVi ? `[Lustio] Lời mời cộng tác: ${quizTitle}` : `[Lustio] Collaboration Invitation: ${quizTitle}`;
        
        const html = isVi ? `
            <div style="font-family: sans-serif; padding: 20px; color: #333;">
                <h2 style="color: #4f46e5;">Chào bạn!</h2>
                <p><strong>${inviterName}</strong> đã mời bạn cộng tác trong khóa học: <strong>${quizTitle}</strong></p>
                <div style="margin: 30px 0;">
                    <a href="${inviteLink}" style="background-color: #4f46e5; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">
                        Chấp nhận lời mời
                    </a>
                </div>
                <p style="font-size: 11px; color: #999;">Đây là email tự động từ hệ thống Lustio Quizz.</p>
            </div>
        ` : `
            <div style="font-family: sans-serif; padding: 20px; color: #333;">
                <h2 style="color: #4f46e5;">Hello!</h2>
                <p><strong>${inviterName}</strong> has invited you to collaborate on: <strong>${quizTitle}</strong></p>
                <div style="margin: 30px 0;">
                    <a href="${inviteLink}" style="background-color: #4f46e5; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">
                        Accept Invitation
                    </a>
                </div>
                <p style="font-size: 11px; color: #999;">This is an automated email from Lustio Quizz.</p>
            </div>
        `;

        const { data, error } = await resend.emails.send({
            from: 'Lustio Quizz <onboarding@resend.dev>',
            to: inviteeEmail,
            subject: subject,
            html: html,
        });

        if (error) return NextResponse.json({ success: false, error: error.message }, { status: 400 });
        return NextResponse.json({ success: true, data });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
