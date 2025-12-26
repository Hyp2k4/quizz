import { Resend } from 'resend';
import { NextResponse } from 'next/server';

const resend = new Resend(process.env.RESEND_API_KEY || 're_not_set');

export async function POST(request: Request) {
    try {
        const { type, to, data, language = 'vi' } = await request.json();

        if (!process.env.RESEND_API_KEY) {
            return NextResponse.json({ success: false, error: "Resend not configured" });
        }

        let subject = "";
        let html = "";
        const isVi = language === 'vi';

        if (type === 'comment') {
            subject = isVi ? `[Lustio] Bình luận mới trong: ${data.quizTitle}` : `[Lustio] New comment in: ${data.quizTitle}`;
            html = `
                <div style="font-family: sans-serif; padding: 20px; color: #333;">
                    <h2 style="color: #4f46e5;">${isVi ? 'Bình luận mới!' : 'New Comment!'}</h2>
                    <p><strong>${data.userName}</strong> đã để lại bình luận trong khóa học <strong>${data.quizTitle}</strong> của bạn:</p>
                    <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #4f46e5;">
                        "${data.commentText}"
                    </div>
                    <a href="${data.link}" style="background-color: #4f46e5; color: white; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-weight: bold;">
                        ${isVi ? 'Xem bình luận' : 'View Comment'}
                    </a>
                </div>
            `;
        } else if (type === 'reply') {
            subject = isVi ? `[Lustio] Phản hồi mới cho bình luận của bạn` : `[Lustio] New reply to your comment`;
            html = `
                <div style="font-family: sans-serif; padding: 20px; color: #333;">
                    <h2 style="color: #4f46e5;">${isVi ? 'Phản hồi mới!' : 'New Reply!'}</h2>
                    <p><strong>${data.userName}</strong> đã phản hồi bình luận của bạn trong khóa học <strong>${data.quizTitle}</strong>:</p>
                    <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #4f46e5;">
                        "${data.replyText}"
                    </div>
                    <a href="${data.link}" style="background-color: #4f46e5; color: white; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-weight: bold;">
                        ${isVi ? 'Xem phản hồi' : 'View Reply'}
                    </a>
                </div>
            `;
        } else if (type === 'completion') {
            subject = isVi ? `[Lustio] Học viên hoàn thành: ${data.quizTitle}` : `[Lustio] Learner completed: ${data.quizTitle}`;
            html = `
                <div style="font-family: sans-serif; padding: 20px; color: #333;">
                    <h2 style="color: #10b981;">${isVi ? 'Khóa học đã hoàn thành!' : 'Course Completed!'}</h2>
                    <p>Học viên <strong>${data.userName}</strong> vừa hoàn thành khóa học <strong>${data.quizTitle}</strong> của bạn.</p>
                    <div style="margin: 20px 0; background: #ecfdf5; padding: 20px; border-radius: 12px; border: 1px solid #10b981;">
                        <p style="margin: 0; font-size: 18px;">${isVi ? 'Kết quả' : 'Result'}: <strong>${data.score}/${data.total}</strong></p>
                        <p style="margin: 5px 0 0 0; color: #666;">${isVi ? 'Thời gian' : 'Time'}: ${data.time}</p>
                    </div>
                    <a href="${data.link}" style="background-color: #4f46e5; color: white; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-weight: bold;">
                        ${isVi ? 'Xem bảng xếp hạng' : 'View Leaderboard'}
                    </a>
                </div>
            `;
        }

        const { data: resData, error } = await resend.emails.send({
            from: 'Lustio Notifications <onboarding@resend.dev>',
            to: to,
            subject: subject,
            html: html,
        });

        if (error) return NextResponse.json({ success: false, error });
        return NextResponse.json({ success: true, resData });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
