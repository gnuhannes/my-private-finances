import argparse
import asyncio
from pathlib import Path

from my_private_finances.db import create_engine, create_session_factory
from my_private_finances.services.csv_import import import_transactions_from_csv_path


def _build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(description="Import transaction from a generic CSV.")
    p.add_argument("csv_path", type=Path, help="Path to the CSV file.")
    p.add_argument(
        "--db",
        dest="database_url",
        type=str,
        required=True,
        help="SQLAlchemy database URL",
    )
    p.add_argument(
        "--account-id",
        dest="account_id",
        type=int,
        required=True,
        help="Target account id",
    )
    p.add_argument(
        "--max-errors",
        dest="max_errors",
        type=int,
        default=50,
        help="Max errors to print/store",
    )

    return p


async def _run(
    database_url: str, account_id: int, csv_path: Path, max_errors: int
) -> int:
    engine = create_engine(database_url)
    session_factory = create_session_factory(engine)

    try:
        async with session_factory() as session:
            result = await import_transactions_from_csv_path(
                session=session,
                account_id=account_id,
                csv_path=csv_path,
                max_errors=max_errors,
            )

        print(f"total rows: {result.total_rows}")
        print(f"created: {result.created}")
        print(f"duplicates: {result.duplicates}")
        print(f"failed: {result.failed}")

        if result.errors:
            print("\nerrors:")
            for error in result.errors:
                print(f"- {error}")

        return 1 if result.failed else 0

    finally:
        await engine.dispose()


def main() -> None:
    args = _build_parser().parse_args()
    exit_code = asyncio.run(
        _run(
            database_url=args.database_url,
            account_id=args.account_id,
            csv_path=args.csv_path,
            max_errors=args.max_errors,
        )
    )
    raise SystemExit(exit_code)


if __name__ == "__main__":
    main()
