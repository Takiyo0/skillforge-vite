import {Navigate, useParams} from 'react-router-dom';
import {AdminUnits} from '@skillforge/vite/components/pages/admin/AdminUnits';

export function AdminCourseDetail() {
    const {courseId} = useParams<{ courseId: string }>();

    if (!courseId) {
        return <Navigate to="/admin/courses" replace/>;
    }

    return <AdminUnits courseId={courseId}/>;
}
