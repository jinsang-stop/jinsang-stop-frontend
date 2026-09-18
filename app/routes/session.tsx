import { Link, useParams, useSearchParams } from "react-router";

import { Page } from "~/components/Page";

/**
 * 훈련 세션 화면은 이슈 #3에서 만든다. 여기서는 카드·강도 선택이 다음 단계로
 * 넘어간다는 것만 확인할 수 있게 자리만 잡아 둔다.
 */
export default function Session() {
  const { cardId } = useParams();
  const [searchParams] = useSearchParams();

  return (
    <Page
      title="훈련 세션"
      description="세션 화면은 아직 만들지 않았습니다 (이슈 #3)."
    >
      <p className="text-gray-700 dark:text-gray-300">
        카드 <code>{cardId}</code> · 강도 {searchParams.get("intensity")}단계로
        시작합니다.
      </p>
      <p className="mt-6">
        <Link to={`/cards/${cardId}`} className="text-sm underline">
          ← 강도 선택으로 돌아가기
        </Link>
      </p>
    </Page>
  );
}
